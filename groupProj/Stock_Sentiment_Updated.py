import feedparser
import requests
from bs4 import BeautifulSoup
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from datetime import datetime, timezone, timedelta
from urllib.parse import quote
import re
import time

from transformers import AutoTokenizer, AutoModelForSequenceClassification, BertTokenizer, BertForSequenceClassification
import torch
import numpy as np
from urllib.parse import quote
from urllib.parse import quote_plus

finbert = BertForSequenceClassification.from_pretrained('yiyanghkust/finbert-tone',num_labels=3)
tokeniser = BertTokenizer.from_pretrained('yiyanghkust/finbert-tone')

labels = ['Positive', 'Negative', 'Neutral']

def fetch_articles(stock):
    base    = "https://news.google.com/rss/search?hl=en-GB&gl=GB&ceid=GB:en&q="
    feeds   = [
        base + quote_plus(f"{stock} market"),
        base + quote_plus(f"{stock} price"),
        base + quote_plus(f"{stock} investment"),
        base + quote_plus(f"{stock} trends"),
        base + quote_plus(f"{stock} analysis"),
        base + quote_plus(f"{stock} forecast"),
        base + quote_plus(f"{stock} news"),
    ]
    articles, seen = [], set()
    headers = {"User-Agent": "Mozilla/5.0 (compatible; StockSentiment)"}
    for url in feeds:
        try:
            feed = feedparser.parse(url, request_headers=headers)
            for entry in feed.entries[:10]:
                raw = entry.get("title", "").strip()
                if not raw or raw in seen:
                    continue
                seen.add(raw)
                summary = clean_html(entry.get("summary", ""))
                combined = f"{raw}. {summary}"
                parts  = raw.rsplit(" - ", 1)
                title  = parts[0].strip() if len(parts) > 1 else raw
                source = parts[1].strip() if len(parts) > 1 else feed.feed.get("title", "News")
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
        except Exception as e:
            (f"Feed error: {e}")
        time.sleep(0.4)
    return articles

def clean_html(text):
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&[a-z]+;", " ", text)
    return re.sub(r"\s+", " ", text).strip()

def analyse_sentiment(contents):
    if not contents.strip():
        return 'Neutral', 0.0
    inputs = tokeniser(contents, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        outputs = finbert(**inputs)
    logits = outputs.logits
    probabilities = torch.softmax(logits, dim=1).numpy()[0]
    max_index = np.argmax(probabilities)
    sentiment = finbert.config.id2label[max_index]
    print(probabilities)
    confidence = probabilities[max_index]
    return sentiment, confidence

def summarise_sentiments(articles):
    summary = {
        "Positive": 0,
        "Negative": 0,
        "Neutral": 0
    }

    for article in articles:
        summary[article['sentiment']] += 1

    total = len(articles)
    print("\n--- Market Sentiment Summary ---")
    print(f"Total articles analysed: {total}")
    for sentiment, count in summary.items():
        percent = (count / total) * 100
        print(f"{sentiment}: {count} ({percent:.2f}%)")

def main():
    stock = "nvidia"
    articles = fetch_articles(stock)
    summarise_sentiments(articles)
    print(articles)
    

if __name__ == "__main__":
    main()