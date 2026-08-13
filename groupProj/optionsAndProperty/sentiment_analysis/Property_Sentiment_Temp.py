import feedparser
import requests
import time
import re
from textblob import TextBlob
from bs4 import BeautifulSoup
from datetime import datetime, timezone, timedelta
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from datetime import datetime
from urllib.parse import quote
from urllib.parse import quote_plus

labels = ['Positive', 'Negative', 'Neutral']

KENT_POSTCODES = {
    "CT — Canterbury & East Kent": [
        ("CT1",  "Canterbury"),
        ("CT2",  "Canterbury North"),
        ("CT3",  "Canterbury Rural"),
        ("CT4",  "Canterbury South"),
        ("CT5",  "Whitstable"),
        ("CT6",  "Herne Bay"),
        ("CT7",  "Birchington"),
        ("CT8",  "Westgate-on-Sea"),
        ("CT9",  "Margate"),
        ("CT10", "Broadstairs"),
        ("CT11", "Ramsgate"),
        ("CT12", "Ramsgate Rural"),
        ("CT13", "Sandwich"),
        ("CT14", "Deal"),
        ("CT15", "Dover Rural"),
        ("CT16", "Dover"),
        ("CT17", "Dover West"),
        ("CT18", "Folkestone Rural"),
        ("CT19", "Folkestone"),
        ("CT20", "Folkestone Central"),
        ("CT21", "Hythe"),
    ],
    "DA — Dartford & North Kent": [
        ("DA1",  "Dartford"),
        ("DA2",  "Dartford South"),
        ("DA3",  "Longfield"),
        ("DA4",  "Swanley"),
        ("DA9",  "Greenhithe"),
        ("DA10", "Swanscombe"),
        ("DA11", "Gravesend"),
        ("DA12", "Gravesend East"),
        ("DA13", "Meopham"),
    ],
    "ME — Medway & Mid Kent": [
        ("ME1",  "Rochester"),
        ("ME2",  "Strood"),
        ("ME3",  "Hoo Peninsula"),
        ("ME4",  "Chatham"),
        ("ME5",  "Chatham South"),
        ("ME6",  "Snodland"),
        ("ME7",  "Gillingham"),
        ("ME8",  "Rainham"),
        ("ME9",  "Sittingbourne Rural"),
        ("ME10", "Sittingbourne"),
        ("ME11", "Queenborough"),
        ("ME12", "Sheerness"),
        ("ME13", "Faversham"),
        ("ME14", "Maidstone"),
        ("ME15", "Maidstone South"),
        ("ME16", "Maidstone West"),
        ("ME17", "Maidstone Rural"),
        ("ME18", "West Malling"),
        ("ME19", "Kings Hill"),
        ("ME20", "Aylesford"),
    ],
    "TN — Tunbridge Wells & Weald": [
        ("TN1",  "Tunbridge Wells"),
        ("TN2",  "Tunbridge Wells East"),
        ("TN3",  "Tunbridge Wells Rural"),
        ("TN4",  "Tunbridge Wells North"),
        ("TN8",  "Edenbridge"),
        ("TN9",  "Tonbridge"),
        ("TN10", "Tonbridge North"),
        ("TN11", "Hadlow"),
        ("TN12", "Paddock Wood"),
        ("TN13", "Sevenoaks"),
        ("TN14", "Sevenoaks North"),
        ("TN15", "Borough Green"),
        ("TN16", "Westerham"),
        ("TN17", "Cranbrook"),
        ("TN18", "Hawkhurst"),
        ("TN27", "Headcorn"),
        ("TN28", "New Romney"),
        ("TN29", "Lydd"),
        ("TN30", "Tenterden"),
    ],
}

ALL_ENTRIES = [
    (code, town, group)
    for group, entries in KENT_POSTCODES.items()
    for code, town in entries
]

labels = ['Positive', 'Negative', 'Neutral']

def show_postcode_menu(prompt="  Your choice: "):
    while True:
        idx = 1
        for group, entries in KENT_POSTCODES.items():
            prefix, label = group.split("—")
            print(f"  {prefix.strip()}  {label.strip()}")
            for code, town in entries:
                print(f"    {idx:>2}.  {code:<5}  {town}")
                idx += 1
            print()
        raw = input(prompt).strip()
        upper = raw.upper().strip()
        for code, town, _ in ALL_ENTRIES:
            if code == upper:
                return code, town

def fetch_articles(postcode: str, town: str) -> list[dict]:
    base    = "https://news.google.com/rss/search?hl=en-GB&gl=GB&ceid=GB:en&q="
    feeds   = [
        base + quote_plus(f"{town} Kent housing property"),
        base + quote_plus(f"{town} property price Kent"),
        base + quote_plus(f"{postcode} house for sale"),
        base + quote_plus(f"{town} mortgage rent Kent"),
    ]
    articles, seen = [], set()
    headers = {"User-Agent": "Mozilla/5.0 (compatible; PropertySentiment)"}
    for url in feeds:
        try:
            feed = feedparser.parse(url, request_headers=headers)
            for entry in feed.entries[:50]:
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
            pass
        time.sleep(0.4)
    return articles

def clean_html(text):
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"&[a-z]+;", " ", text)
    return re.sub(r"\s+", " ", text).strip()

def fetch_article_content(url):
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        paragraphs = soup.find_all('p')
        content = ' '.join([p.get_text() for p in paragraphs])
        return content.strip()
    except requests.RequestException:
        return "Content not retrieved."

def analyse_sentiment(text: str) -> tuple[str, float]:
    polarity = round(TextBlob(text).sentiment.polarity, 4)
    if polarity > 0.05:
        return labels[0], polarity
    elif polarity < -0.05:
        return labels[1], polarity
    return labels[2], polarity

def summarise_sentiments(articles):
    summary = {
        "Positive": 0,
        "Negative": 0,
        "Neutral": 0
    }

    for article in articles:
        #use the sentiment already calculated in fetch articles, if missing fallback to calculating sentiment from the article title. 
        sentiment  = article.get('sentiment')
        if sentiment not in summary:
            sentiment, _ = analyse_sentiment(article['title']) # + " " + article['content'])
        summary[sentiment] += 1

    total = len(articles)
    print("\n--- Market Sentiment Summary ---")
    print(f"Total articles analyzed: {total}")
    for sentiment, count in summary.items():
        percent = (count / total) * 100
        print(f"{sentiment}: {count} ({percent:.2f}%)")

def main():
    choice = show_postcode_menu()
    postcode, town = choice
    articles = fetch_articles(postcode, town)
    summarise_sentiments(articles)
    print(articles)
        

if __name__ == "__main__":
    main()