import feedparser
import requests
from bs4 import BeautifulSoup
from textblob import TextBlob
from datetime import datetime
from urllib.parse import quote, urlparse
from transformers import AutoTokenizer, AutoModelForSequenceClassification, BertTokenizer, BertForSequenceClassification

import torch
import numpy as np
import gc

# Set device to GPU (MPS) for M2 Mac
if torch.backends.mps.is_available():
    device = torch.device("mps")
    print("Using Apple MPS (GPU) acceleration")
else:
    device = torch.device("cpu")
    print("MPS not available, using CPU")

# Load FinBERT model and move to GPU
finbert = BertForSequenceClassification.from_pretrained('yiyanghkust/finbert-tone', num_labels=3).to(device)
tokeniser = BertTokenizer.from_pretrained('yiyanghkust/finbert-tone')

results = ['Neutral', 'Negative', 'Positive']

# Webscraper
# Searches using queries declared in Main()
# Gets link, title, publish time + date and calls getArticleContent
# Appends above info to articles
#
def scraper(query, num_articles=10):
    rssUrl = f"https://news.google.com/rss/search?q={quote(query)}" # creates rss link by searching using queries in main
    feed = feedparser.parse(rssUrl)
    items = feed.entries[:num_articles]

    articles = []
    for item in items:
        link = item.link
        title = item.title
        published = item.published
        source = getattr(getattr(item, 'source', None), 'title', None)
        if not source:
            source = urlparse(link).netloc
        content = getArticleContent(link)
        # appends article info to articles
        articles.append({ 
            "link": link,
            "title": title,
            "published": published,
            "source": source,
            "Content": content
        })

    return articles

# 
def getArticleContent(articleUrl):
    try:
        response = requests.get(articleUrl, timeout=5)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        content = soup.find_all('p')
        allContent = ' '.join([p.get_text() for p in content])
        return allContent.strip()
    except requests.RequestException:
        return("not found")

def sentimentAnalysis(contents):
    if not contents.strip():
        return 0.0, 'Neutral'
    
    # Move inputs to GPU
    inputs = tokeniser(contents, return_tensors="pt", truncation=True, max_length=512).to(device)
    
    with torch.no_grad():
        outputs = finbert(**inputs)
    
    logits = outputs.logits
    # Move back to CPU for numpy processing
    probabilities = torch.softmax(logits, dim=1).cpu().numpy()[0]
    max_index = np.argmax(probabilities)
    sentiment = results[max_index]
    confidence = probabilities[max_index]
    
    # Clear GPU cache to prevent memory buildup
    del inputs
    if torch.backends.mps.is_available():
        torch.mps.empty_cache()
    gc.collect()
    
    return confidence, sentiment

def summary(articles):
    summary = {
        "Positive": 0,
        "Negative": 0,
        "Neutral": 0
    }

    for article in articles:
        _, sentiment = sentimentAnalysis(article['title']) # + " " + article['content'])
        summary[sentiment] += 1

    total = len(articles)
    print("\n--- Market Sentiment Summary ---")
    print(f"Total articles analyzed: {total}")
    for sentiment, count in summary.items():
        percent = (count / total) * 100
        print(f"{sentiment}: {count} ({percent:.2f}%)")

def sortByIndex(articleList = []):
    articleList.sort(key=lambda x: x[0])
    print(articleList)
    return articleList

def sortByPolarity(articleList = []):
    articleList.sort(key=lambda x: x[4])
    print(articleList)
    return articleList

def sortByPublished(articleList = []):
    articleList.sort(key=lambda x: x[3])
    print(articleList)
    return articleList


def main():
    stock = "nvidia"
    queries = [
        stock +" market",
        stock +" price",
        stock +" news",
        stock +" trends",
        stock +" analysis",
        stock +" forecast",
        stock +" investment"
    ]
    numberPerQuery = 10
    allArticles = []
    neutArticles = []
    posArticles = []
    negArticles = []

    for query in queries:
        print(f"Fetching news articles for '{query}'...\n")
        articles = scraper(query, numberPerQuery)
        allArticles.extend(articles)

    for index, article in enumerate(allArticles, 1):
        print(f"Article {index}: {article['title']}")
        print(f"Link: {article['link']}")
        print(f"Published: {article['published']}")
        polarity, sentiment = sentimentAnalysis(article['title'])  # or article['content']
        if sentiment == "Neutral":
            neutArticles.append([index, article['link'], article['title'], article['published'], polarity, sentiment])
        elif sentiment == "Positive":
            posArticles.append([index, article['link'], article['title'], article['published'], polarity, sentiment])
        elif sentiment == "Negative":
            negArticles.append([index, article['link'], article['title'], article['published'], polarity, sentiment])
        print(f"Sentiment: {sentiment} (Polarity: {polarity:.2f})\n")

    sortByPolarity(negArticles)
    sortByIndex(negArticles)
    sortByPublished(negArticles)
    summary(allArticles)



if __name__ == "__main__":
    main()
    