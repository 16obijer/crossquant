from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import IntegrityError
from django.core.cache import cache
from .models import UserStock, Property
from .serializers import UserStockSerializer, PropertySerializer
import yfinance as yf
from collections import defaultdict
from datetime import datetime, timedelta
import math
import requests


def get_exchange_rate(from_currency, to_currency='USD'):
    """Get exchange rate from Frankfurter API with caching"""
    if from_currency == to_currency:
        return 1.0
    
    cache_key = f"exchange_rate_{from_currency}_{to_currency}"
    rate = cache.get(cache_key)
    
    if rate is None:
        try:
            url = f"https://api.frankfurter.app/latest?from={from_currency}&to={to_currency}"
            response = requests.get(url, timeout=5)
            data = response.json()
            rate = data['rates'][to_currency]
            cache.set(cache_key, rate, 3600)
        except Exception as e:
            print(f"Exchange rate error: {e}")
            rate = 1.0
    
    return rate


def convert_currency(amount, from_currency, to_currency='USD'):
    """Convert amount from one currency to another"""
    if from_currency == to_currency:
        return amount
    rate = get_exchange_rate(from_currency, to_currency)
    return amount * rate


def _normalize_country(country):
    """Normalize country names to consistent format."""
    if not country:
        return 'Other'
    
    country = str(country).strip().upper()
    
    country_map = {
        'US': 'United States',
        'USA': 'United States',
        'GB': 'United Kingdom',
        'UK': 'United Kingdom',
        'CA': 'Canada',
        'JP': 'Japan',
        'DE': 'Germany',
        'FR': 'France',
        'CH': 'Switzerland',
        'AU': 'Australia',
        'IN': 'India',
        'CN': 'China',
    }
    
    if country in country_map:
        return country_map[country]
    
    return country.title() if country else 'Other'


def _get_close_price_on_or_before(symbol, target_date):
    """Get the closing price on target date, or most recent prior trading day."""
    ticker = yf.Ticker(symbol)
    start = target_date - timedelta(days=10)
    end = target_date + timedelta(days=1)
    hist = ticker.history(start=start, end=end)

    if hist.empty:
        return None

    closes = hist['Close'].dropna()
    if closes.empty:
        return None

    closes.index = closes.index.tz_localize(None)
    valid = closes[closes.index.date <= target_date]
    if valid.empty:
        return None

    return float(valid.iloc[-1])


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def stock_list(request):
    """List all stocks for the user or create a new one"""
    if request.method == 'GET':
        stocks = UserStock.objects.filter(user=request.user)
        serializer = UserStockSerializer(stocks, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        data = request.data.copy()
        symbol = str(data.get('symbol', '')).upper().strip()
        purchase_date_raw = data.get('purchase_date')

        if not symbol:
            return Response({'symbol': ['This field is required.']}, status=status.HTTP_400_BAD_REQUEST)

        if not purchase_date_raw:
            return Response(
                {'purchase_date': ['Start tracking date is required.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            purchase_date = datetime.strptime(str(purchase_date_raw), '%Y-%m-%d').date()
        except ValueError:
            return Response(
                {'purchase_date': ['Invalid date format. Use YYYY-MM-DD.']},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            close_price = _get_close_price_on_or_before(symbol, purchase_date)
        except Exception:
            close_price = None

        if close_price is None:
            return Response(
                {'error': 'Could not fetch historical price for that symbol/date.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        data['symbol'] = symbol
        data['purchase_date'] = purchase_date.isoformat()
        data['purchase_price'] = f"{close_price:.2f}"
        
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            data['company_name'] = info.get('longName', info.get('shortName', symbol))
            data['sector'] = info.get('sector', 'Other')
            raw_country = info.get('country', 'US')
            data['country'] = _normalize_country(raw_country)
            data['currency'] = info.get('currency', 'USD')
            if data['currency'] == 'GBp':
                data['currency'] = 'GBP'
        except:
            data['company_name'] = symbol
            data['currency'] = 'USD'
        
        serializer = UserStockSerializer(data=data)
        if serializer.is_valid():
            try:
                serializer.save(user=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except IntegrityError:
                return Response(
                    {'error': 'You already have this stock in your portfolio'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def stock_detail(request, pk):
    """Delete a stock"""
    try:
        stock = UserStock.objects.get(pk=pk, user=request.user)
        stock.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except UserStock.DoesNotExist:
        return Response({'error': 'Stock not found'}, status=status.HTTP_404_NOT_FOUND)

@api_view(['GET','POST'])
@permission_classes([IsAuthenticated])
def property_list(request):
    'List all property that user owns'
    if request.method =='GET':
        properties = Property.objects.filter(user = request.user).order_by('-created_at')
        serializer = PropertySerializer(properties, many = True)
        return Response(serializer.data)
    elif request.method == 'POST':
        serializer = PropertySerializer(data = request.data)
        if serializer.is_valid():
            serializer.save(user= request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def property_detail(request,pk):
    'Delete a property '
    try: 
        property_obj = Property.objects.get(pk=pk, user = request.user)
        property_obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    except Property.DoesNotExist:
        return Response({'error':'Property not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def portfolio_summary(request):
    """Get portfolio summary with all metrics converted to USD"""
    base_currency = request.GET.get('base_currency', 'USD')
    stocks = UserStock.objects.filter(user=request.user)
    
    if not stocks.exists():
        return Response({
            'total_value': 0,
            'total_cost': 0,
            'total_gain_loss': 0,
            'total_gain_loss_percentage': 0,
            'stocks_count': 0,
            'weighted_pe': 0,
            'geographic_breakdown': [],
            'sector_breakdown': [],
            'base_currency': base_currency
        })
    
    total_value = 0
    total_cost = 0
    geographic_data = defaultdict(float)
    sector_data = defaultdict(float)
    
    for stock in stocks:
        currency = getattr(stock, 'currency', 'USD')
        
        current_value_original = stock.get_current_value()
        cost_basis_original = stock.get_cost_basis()
        
        current_value = convert_currency(current_value_original, currency, base_currency)
        cost_basis = convert_currency(cost_basis_original, currency, base_currency)
        
        total_value += current_value
        total_cost += cost_basis
        
        normalized_country = _normalize_country(stock.country)
        geographic_data[normalized_country] += current_value
        sector_data[stock.sector or 'Other'] += current_value
    
    geographic_breakdown = [
        {'region': k, 'value': v, 'percentage': (v / total_value * 100) if total_value > 0 else 0}
        for k, v in geographic_data.items()
    ]
    
    sector_breakdown = [
        {'sector': k, 'value': v, 'percentage': (v / total_value * 100) if total_value > 0 else 0}
        for k, v in sector_data.items()
    ]
    
    summary = {
        'total_value': total_value,
        'total_cost': total_cost,
        'total_gain_loss': total_value - total_cost,
        'total_gain_loss_percentage': ((total_value - total_cost) / total_cost * 100) if total_cost > 0 else 0,
        'stocks_count': stocks.count(),
        'weighted_pe': 0,
        'geographic_breakdown': geographic_breakdown,
        'sector_breakdown': sector_breakdown,
        'base_currency': base_currency
    }
    
    return Response(summary)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_price(request, symbol):
    """Check current price for a symbol"""
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info
        price = info.get('regularMarketPrice', info.get('currentPrice', info.get('previousClose', 0)))
        company = info.get('longName', info.get('shortName', symbol))
        return Response({
            'symbol': symbol.upper(),
            'price': float(price) if price else 0,
            'company_name': company
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_symbols(request):
    """Search for stock symbols using yfinance live search"""
    query = request.GET.get('q', '').strip()
    
    if not query or len(query) < 1:
        return Response([])
    
    try:
        search = yf.Search(query, max_results=10)
        matches = []
        for quote in search.quotes:
            symbol = quote.get('symbol', '')
            name = quote.get('longname', quote.get('shortname', symbol))
            if symbol:
                matches.append({'symbol': symbol, 'name': name})
        return Response(matches)
    except Exception as e:
        try:
            ticker = yf.Ticker(query.upper())
            info = ticker.info
            if info and ('longName' in info or 'shortName' in info):
                return Response([{
                    'symbol': query.upper(),
                    'name': info.get('longName', info.get('shortName', query.upper()))
                }])
        except:
            pass
        return Response([])


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stock_history(request, pk):
    """Get historical price data for a stock since its purchase date"""
    try:
        stock = UserStock.objects.get(pk=pk, user=request.user)
    except UserStock.DoesNotExist:
        return Response({'error': 'Stock not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if not stock.purchase_date:
        return Response(
            {'error': 'No purchase date recorded for this stock'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        ticker = yf.Ticker(stock.symbol)
        hist = ticker.history(start=stock.purchase_date)

        history_data = []
        for idx, row in hist.iterrows():
            close = row.get('Close')
            if close is None:
                continue

            try:
                price = float(close)
            except (TypeError, ValueError):
                continue

            if not math.isfinite(price):
                continue

            history_data.append({
                'date': str(idx.date()),
                'price': round(price, 2)
            })

        if not history_data:
            return Response(
                {'error': 'No valid historical price points found for this stock.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'symbol': stock.symbol,
            'company_name': stock.company_name,
            'purchase_date': str(stock.purchase_date),
            'purchase_price': float(stock.purchase_price),
            'history': history_data
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def portfolio_news(request):
    """Fetch recent news articles for all stocks in the user's portfolio"""
    stocks = UserStock.objects.filter(user=request.user)
    if not stocks.exists():
        return Response([])

    seen_urls = set()
    articles = []

    for stock in stocks:
        try:
            ticker = yf.Ticker(stock.symbol)
            news_items = ticker.news or []
            for item in news_items[:8]:
                content = item.get('content', {})

                url = (
                    content.get('canonicalUrl', {}).get('url')
                    or item.get('link', '')
                )
                title = content.get('title') or item.get('title', '')
                publisher = (
                    content.get('provider', {}).get('displayName')
                    or item.get('publisher', '')
                )
                pub_time = (
                    content.get('pubDate')
                    or item.get('providerPublishTime')
                )

                thumbnail = None
                thumb_obj = content.get('thumbnail') or item.get('thumbnail')
                if isinstance(thumb_obj, dict):
                    resolutions = thumb_obj.get('resolutions', [])
                    if resolutions:
                        thumbnail = resolutions[0].get('url')
                elif isinstance(thumb_obj, str):
                    thumbnail = thumb_obj

                if not url or not title or url in seen_urls:
                    continue

                seen_urls.add(url)

                if isinstance(pub_time, str):
                    import datetime as _dt
                    try:
                        pub_time = int(_dt.datetime.fromisoformat(
                            pub_time.replace('Z', '+00:00')
                        ).timestamp())
                    except Exception:
                        pub_time = 0
                elif pub_time is None:
                    pub_time = 0

                articles.append({
                    'title': title,
                    'url': url,
                    'publisher': publisher,
                    'published_at': pub_time,
                    'thumbnail': thumbnail,
                    'related_symbol': stock.symbol,
                    'company_name': stock.company_name,
                })
        except Exception:
            continue

    articles.sort(key=lambda x: x['published_at'], reverse=True)
    return Response(articles[:20])
