import feedparser
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from datetime import datetime, timezone, timedelta
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor, as_completed
import re

from urllib.parse import quote_plus

vader = SentimentIntensityAnalyzer()

FINANCIAL_TERMS = {

    "stock", "shares", "share price", "market cap", "valuation", "ipo",
    "nasdaq", "nyse", "ftse", "s&p", "dow jones",

    "investor", "trading", "traded", "bull", "bear", "rally", "selloff",
    "short", "long", "options", "futures", "dividend", "earnings",

    "revenue", "profit", "loss", "quarterly", "annual report", "guidance",
    "forecast", "analyst", "upgrade", "downgrade", "price target",
    "ceo", "cfo", "board", "shareholder", "acquisition", "merger",

    "portfolio", "hedge fund", "etf", "index fund", "market",
    "wall street", "financial", "fiscal", "q1", "q2", "q3", "q4",
}

def fetch_single_feed(url, headers):
    try:
        return feedparser.parse(url, request_headers=headers)
    except Exception as e:
        print(f"Feed error: {e}")
        return None

def fetch_articles(stock):
    base    = "https://news.google.com/rss/search?q="
    feeds   = [
        base + quote_plus(f"{stock} price"),
        base + quote_plus(f"{stock} price target"),
        base + quote_plus(f"{stock} earnings report"),
        base + quote_plus(f"{stock} investment"),
        base + quote_plus(f"{stock} analysis"),
        base + quote_plus(f"{stock} analyst rating"),
        base + quote_plus(f"{stock} forecast"),
        base + quote_plus(f"{stock} upgrade"),
        base + quote_plus(f"{stock} downgrade"),
    ]
    articles, seen = [], set()
    headers = {"User-Agent": "Mozilla/5.0 (compatible; StockSentiment)"}
    with ThreadPoolExecutor(max_workers=9) as executor:
        futures = {executor.submit(fetch_single_feed, url, headers): url for url in feeds}
        for future in as_completed(futures):
            feed = future.result()
            if feed:
                for entry in feed.entries[:15]:
                    raw = entry.get("title", "").strip()
                    if not raw or raw in seen:
                        continue
                    seen.add(raw)
                    summary = clean_html(entry.get("summary", ""))
                    combined = f"{raw}. {summary}"
                    parts  = raw.rsplit(" - ", 1)
                    title  = parts[0].strip() if len(parts) > 1 else raw
                    source = parts[1].strip() if len(parts) > 1 else feed.feed.get("title", "News")
                    if not is_relevant(title, summary, stock):
                        continue  
                    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
                    date_str = (
                        datetime(*parsed[:6], tzinfo=timezone.utc).strftime("%Y-%m-%d")
                        if parsed else datetime.now(timezone.utc).strftime("%Y-%m-%d")
                    )
                    if parsed:
                        article_date = datetime(*parsed[:6], tzinfo=timezone.utc)
                        cutoff = datetime.now(timezone.utc) - timedelta(days=365)
                        if article_date < cutoff:
                            continue
                    label, polarity = analyse_sentiment(combined)
                    articles.append({
                        "title": title, "source": source, "date": date_str,
                        "sentiment": label, "polarity": polarity,
                        "url": entry.get("link", ""),
            })
    return articles

def clean_html(text):
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&[a-z]+;", " ", text)
    return re.sub(r"\s+", " ", text).strip()

def is_relevant(title, summary, stock):
    combined = (title + " " + summary).lower()
    if stock.lower() not in combined:
        return False
    if not any(term in combined for term in FINANCIAL_TERMS):
        return False
    return True

def analyse_sentiment(contents):
    if not contents.strip():
        return 'Neutral', 0.0
    score = vader.polarity_scores(contents)['compound']
    if score >= 0.05:
        return 'Positive', score
    elif score <= -0.05:
        return 'Negative', score
    else:
        return 'Neutral', score

def summarise_sentiments(articles):
    summary = {
        "Positive": 0,
        "Negative": 0,
        "Neutral": 0
    }
    for article in articles:
        summary[article['sentiment']] += 1
    total = len(articles)
    print("\nMarket Sentiment Summary")
    print(f"Total articles analysed: {total}")
    for sentiment, count in summary.items():
        percent = (count / total) * 100
        print(f"{sentiment}: {count} ({percent:.2f}%)")

def main():
    stock = "Nvidia"
    articles = fetch_articles(stock)
    summarise_sentiments(articles)
   
if __name__ == "__main__":
    main()
