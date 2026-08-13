from django.http import JsonResponse
import importlib
import importlib.util
import re
import sys
import threading
import time
import uuid
from pathlib import Path


SENTIMENT_JOBS = {}
SENTIMENT_JOBS_LOCK = threading.Lock()
JOB_TTL_SECONDS = 30 * 60
PROPERTY_SENTIMENT_JOBS = {}
PROPERTY_SENTIMENT_JOBS_LOCK = threading.Lock()


def _cleanup_old_jobs_locked():
    cutoff = time.time() - JOB_TTL_SECONDS
    stale_job_ids = [
        job_id for job_id, info in SENTIMENT_JOBS.items()
        if info.get('updated_at', 0) < cutoff
    ]
    for job_id in stale_job_ids:
        SENTIMENT_JOBS.pop(job_id, None)


def _cleanup_old_property_jobs_locked():
    cutoff = time.time() - JOB_TTL_SECONDS
    stale_job_ids = [
        job_id for job_id, info in PROPERTY_SENTIMENT_JOBS.items()
        if info.get('updated_at', 0) < cutoff
    ]
    for job_id in stale_job_ids:
        PROPERTY_SENTIMENT_JOBS.pop(job_id, None)


def _set_job_state(job_id, **fields):
    with SENTIMENT_JOBS_LOCK:
        job = SENTIMENT_JOBS.get(job_id)
        if not job:
            return
        job.update(fields)
        job['updated_at'] = time.time()


def _set_property_job_state(job_id, **fields):
    with PROPERTY_SENTIMENT_JOBS_LOCK:
        job = PROPERTY_SENTIMENT_JOBS.get(job_id)
        if not job:
            return
        job.update(fields)
        job['updated_at'] = time.time()


def _load_property_module():
    module_name = 'property_sentiment_temp'
    if module_name in sys.modules:
        return sys.modules[module_name]

    #removing the hardcoded file path for deployment
    file_path = Path(__file__).resolve().parent/ 'Property_Sentiment_Temp.py'
    if not file_path.exists():
        raise FileNotFoundError(f"Missing property sentiment module at {file_path}")

    spec = importlib.util.spec_from_file_location(module_name, file_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


def _resolve_property_query(module, keyword):
    cleaned = keyword.strip()
    if not cleaned:
        return []

    upper = cleaned.upper()

    for code, town, _ in module.ALL_ENTRIES:
        if code == upper:
            return [(code, town)]

    matching_towns = [
        (code,town)
        for code, town, _ in module.ALL_ENTRIES
        if town.upper() == upper or town.upper().startswith(upper+' ')
    ]
    
    if matching_towns:
        return matching_towns

    match = re.match(r'^[A-Z]{1,2}\d{1,2}[A-Z]?', upper)
    if match:
        return [(match.group(0), cleaned)]

    return [(cleaned, cleaned)]


def _calculate_sentiment(stock, on_progress=None):
    module = importlib.import_module('sentiment_analysis.sentiment_analysis')
    scraper = module.scraper
    sentimentAnalysis = module.sentimentAnalysis

    queries = [f"{stock} news", f"{stock} market", f"{stock} price"]
    articles = []

    if on_progress:
        on_progress(5, 'Preparing sentiment pipeline...')

    for index, query in enumerate(queries, start=1):
        if on_progress:
            on_progress(10 + (index - 1) * 15, f"Fetching news sources ({index}/{len(queries)})...")
        articles.extend(scraper(query, 5))

    pos = neg = neu = 0
    analyzed_sources = {
        'positive': [],
        'negative': [],
        'neutral': [],
    }
    seen_links_by_sentiment = {
        'positive': set(),
        'negative': set(),
        'neutral': set(),
    }

    total_articles = len(articles)
    for article_index, article in enumerate(articles, start=1):
        title = article.get('title', '')
        if title:
            _, sentiment = sentimentAnalysis(title)
            if sentiment == 'Positive':
                pos += 1
                sentiment_key = 'positive'
            elif sentiment == 'Negative':
                neg += 1
                sentiment_key = 'negative'
            else:
                neu += 1
                sentiment_key = 'neutral'

            link = article.get('link')
            if link and link not in seen_links_by_sentiment[sentiment_key]:
                analyzed_sources[sentiment_key].append({
                    'title': title,
                    'link': link,
                    'source': article.get('source', 'Unknown source'),
                })
                seen_links_by_sentiment[sentiment_key].add(link)

        if on_progress and total_articles:
            pct = 55 + int((article_index / total_articles) * 35)
            on_progress(min(90, pct), f"Analyzing sentiment ({article_index}/{total_articles})...")

    total = pos + neg + neu

    if on_progress:
        on_progress(95, 'Finalizing sentiment summary...')

    return {
        'positive': round((pos / total) * 100) if total else 0,
        'negative': round((neg / total) * 100) if total else 0,
        'neutral': round((neu / total) * 100) if total else 0,
        'sources': analyzed_sources,
    }


def _run_sentiment_job(job_id, stock):
    def report(progress, stage):
        _set_job_state(
            job_id,
            progress=max(0, min(100, int(progress))),
            stage=stage,
            status='running',
        )

    try:
        report(5, 'Queued for execution...')
        result = _calculate_sentiment(stock, on_progress=report)
        _set_job_state(
            job_id,
            status='done',
            progress=100,
            stage='Completed',
            result=result,
            error=None,
        )
    except Exception as exc:
        _set_job_state(
            job_id,
            status='failed',
            stage='Failed',
            error=str(exc),
        )


def _calculate_property_sentiment(keyword, on_progress=None):
    module = _load_property_module()

    if on_progress:
        on_progress(5, 'Preparing housing sentiment pipeline...')

    queries = _resolve_property_query(module,keyword)
    
    if not queries:
        cleaned = keyword.strip() or 'Kent'
        queries = [(cleaned,cleaned)]

    # Town searches can resolve to multiple postcode districts.
    # Example: Canterbury -> CT1, CT2, CT3, CT4; CT1 -> CT1 only.

    articles = []
    seen_articles = set()
    for postcode,town in queries:
        fetched_articles = module.fetch_articles(postcode,town)
        for article in fetched_articles:
            link = article.get('link') or article.get('url')
            title = article.get('title','')
            unique_key = link or title
            if unique_key and unique_key not in seen_articles:
                articles.append(article)
                seen_articles.add(unique_key)
    
    counts = {
        'Positive': 0,
        'Negative': 0,
        'Neutral': 0,
    }
    analyzed_sources = {
        'positive': [],
        'negative': [],
        'neutral': [],
    }
    seen_links_by_sentiment = {
        'positive': set(),
        'negative': set(),
        'neutral': set(),
    }

    total_articles = len(articles)
    for article_index, article in enumerate(articles, start=1):
        #Get the article title from the dictionary, if no title use empty string 
        title = article.get('title', '')
        #if article has title, get the sentiment
        if title:
            sentiment, _ = module.analyse_sentiment(title)
            counts[sentiment] += 1

            if sentiment == 'Positive':
                sentiment_key = 'positive'
            elif sentiment == 'Negative':
                sentiment_key = 'negative'
            else:
                sentiment_key = 'neutral'

            link = article.get('link') or article.get('url') 
            if link and link not in seen_links_by_sentiment[sentiment_key]:
                analyzed_sources[sentiment_key].append({
                    'title': title,
                    'link': link,
                    'source': article.get('source', 'Google News'),
                    'date':article.get('date'),
                    'polarity':article.get('polarity')
                })
                seen_links_by_sentiment[sentiment_key].add(link)

        if on_progress and total_articles:
            pct = 55 + int((article_index / total_articles) * 35)
            on_progress(min(90, pct), f"Analyzing sentiment ({article_index}/{total_articles})...")

    total = sum(counts.values())

    if on_progress:
        on_progress(95, 'Finalizing sentiment summary...')

    return {
        'positive': round((counts['Positive'] / total) * 100) if total else 0,
        'negative': round((counts['Negative'] / total) * 100) if total else 0,
        'neutral': round((counts['Neutral'] / total) * 100) if total else 0,
        'sources': analyzed_sources,
    }


def _run_property_sentiment_job(job_id, keyword):
    def report(progress, stage):
        _set_property_job_state(
            job_id,
            progress=max(0, min(100, int(progress))),
            stage=stage,
            status='running',
        )

    try:
        report(5, 'Queued for execution...')
        result = _calculate_property_sentiment(keyword, on_progress=report)
        _set_property_job_state(
            job_id,
            status='done',
            progress=100,
            stage='Completed',
            result=result,
            error=None,
        )
    except Exception as exc:
        _set_property_job_state(
            job_id,
            status='failed',
            stage='Failed',
            error=str(exc),
        )


def start_sentiment_job(request):
    stock = request.GET.get('stock', 'AAPL').strip().upper() or 'AAPL'
    job_id = str(uuid.uuid4())

    with SENTIMENT_JOBS_LOCK:
        _cleanup_old_jobs_locked()
        SENTIMENT_JOBS[job_id] = {
            'status': 'queued',
            'progress': 0,
            'stage': 'Queued',
            'stock': stock,
            'result': None,
            'error': None,
            'updated_at': time.time(),
        }

    worker = threading.Thread(target=_run_sentiment_job, args=(job_id, stock), daemon=True)
    worker.start()

    return JsonResponse({
        'job_id': job_id,
        'status': 'queued',
        'progress': 0,
        'stage': 'Queued',
    })


def get_sentiment_status(request, job_id):
    with SENTIMENT_JOBS_LOCK:
        job = SENTIMENT_JOBS.get(job_id)

    if not job:
        return JsonResponse({'error': 'Job not found'}, status=404)

    payload = {
        'job_id': job_id,
        'status': job.get('status', 'queued'),
        'progress': job.get('progress', 0),
        'stage': job.get('stage', 'Queued'),
        'error': job.get('error'),
    }
    if job.get('status') == 'done':
        payload['result'] = job.get('result')

    return JsonResponse(payload)

def get_sentiment(request):
    stock = request.GET.get('stock', 'AAPL')
    data = _calculate_sentiment(stock)
    return JsonResponse(data)


def start_property_sentiment_job(request):
    keyword = request.GET.get('keyword', '').strip() or 'Canterbury'
    job_id = str(uuid.uuid4())

    with PROPERTY_SENTIMENT_JOBS_LOCK:
        _cleanup_old_property_jobs_locked()
        PROPERTY_SENTIMENT_JOBS[job_id] = {
            'status': 'queued',
            'progress': 0,
            'stage': 'Queued',
            'keyword': keyword,
            'result': None,
            'error': None,
            'updated_at': time.time(),
        }

    worker = threading.Thread(target=_run_property_sentiment_job, args=(job_id, keyword), daemon=True)
    worker.start()

    return JsonResponse({
        'job_id': job_id,
        'status': 'queued',
        'progress': 0,
        'stage': 'Queued',
    })


def get_property_sentiment_status(request, job_id):
    with PROPERTY_SENTIMENT_JOBS_LOCK:
        job = PROPERTY_SENTIMENT_JOBS.get(job_id)

    if not job:
        return JsonResponse({'error': 'Job not found'}, status=404)

    payload = {
        'job_id': job_id,
        'status': job.get('status', 'queued'),
        'progress': job.get('progress', 0),
        'stage': job.get('stage', 'Queued'),
        'error': job.get('error'),
    }
    if job.get('status') == 'done':
        payload['result'] = job.get('result')

    return JsonResponse(payload)


def get_property_sentiment(request):
    keyword = request.GET.get('keyword', '').strip() or 'Canterbury'
    data = _calculate_property_sentiment(keyword)
    return JsonResponse(data)