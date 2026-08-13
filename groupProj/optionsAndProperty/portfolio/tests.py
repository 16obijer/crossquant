from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from datetime import date, timedelta
from decimal import Decimal

from portfolio.models import UserStock, Property

User = get_user_model()


class UserStockModelTests(TestCase):
    """Tests for the UserStock model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@test.com',
            password='testpass123'
        )
        self.stock = UserStock.objects.create(
            user=self.user,
            symbol='AAPL',
            company_name='Apple Inc.',
            shares=10,
            purchase_price=150.00,
            purchase_date=date(2024, 1, 1),
            sector='Technology',
            country='United States',
            currency='USD'
        )
    
    def test_stock_creation(self):
        self.assertEqual(self.stock.symbol, 'AAPL')
        self.assertEqual(self.stock.company_name, 'Apple Inc.')
        self.assertEqual(float(self.stock.shares), 10)
        self.assertEqual(float(self.stock.purchase_price), 150.00)
        self.assertEqual(self.stock.currency, 'USD')
    
    def test_string_representation(self):
        expected = f"{self.user.email} - AAPL"
        self.assertEqual(str(self.stock), expected)
    
    def test_cost_basis_calculation(self):
        self.assertEqual(self.stock.get_cost_basis(), 1500.00)
    
    @patch('portfolio.models.yf.Ticker')
    def test_get_current_price_success(self, mock_ticker):
        mock_instance = MagicMock()
        mock_instance.info = {'regularMarketPrice': 175.50}
        mock_ticker.return_value = mock_instance
        price = self.stock.get_current_price()
        self.assertEqual(price, 175.50)
    
    @patch('portfolio.models.yf.Ticker')
    def test_get_current_price_fallback(self, mock_ticker):
        mock_instance = MagicMock()
        mock_instance.info = {'previousClose': 170.00}
        mock_ticker.return_value = mock_instance
        price = self.stock.get_current_price()
        self.assertEqual(price, 170.00)
    
    @patch('portfolio.models.yf.Ticker')
    def test_get_current_price_exception(self, mock_ticker):
        mock_ticker.side_effect = Exception('API Error')
        price = self.stock.get_current_price()
        self.assertEqual(price, 0)
    
    @patch('portfolio.models.UserStock.get_current_price')
    def test_get_current_value(self, mock_get_price):
        mock_get_price.return_value = 175.50
        self.assertEqual(self.stock.get_current_value(), 1755.00)


class PropertyModelTests(TestCase):
    """Tests for the Property model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='prop@test.com',
            password='testpass123'
        )
        self.property = Property.objects.create(
            user=self.user,
            property_type='Apartment',
            address='SW1A 1AA',
            purchase_price=500000.00,
            ownership_percentage=100.00,
            monthly_rent=2000.00
        )
    
    def test_property_creation(self):
        self.assertEqual(self.property.property_type, 'Apartment')
        self.assertEqual(self.property.address, 'SW1A 1AA')
        self.assertEqual(float(self.property.purchase_price), 500000.00)
        self.assertEqual(float(self.property.ownership_percentage), 100.00)
        self.assertEqual(float(self.property.monthly_rent), 2000.00)
    
    def test_string_representation(self):
        expected = f"Apartment-SW1A 1AA"
        self.assertEqual(str(self.property), expected)
    
    def test_annual_rent_calculation(self):
        """Annual rent should be monthly_rent * 12"""
        annual = float(self.property.monthly_rent) * 12
        self.assertEqual(annual, 24000.00)
    
    def test_ownership_percentage_default(self):
        """Test default ownership percentage is 100"""
        prop2 = Property.objects.create(
            user=self.user,
            property_type='House',
            address='NW3 4BT',
            purchase_price=750000.00,
            monthly_rent=3000.00
        )
        self.assertEqual(float(prop2.ownership_percentage), 100.00)
    
    def test_property_without_rent(self):
        """Property can have null monthly_rent"""
        prop2 = Property.objects.create(
            user=self.user,
            property_type='Commercial',
            address='EC1A 1BB',
            purchase_price=1000000.00,
            ownership_percentage=50.00,
            monthly_rent=None
        )
        self.assertIsNone(prop2.monthly_rent)


class PortfolioAPITests(TestCase):
    """Tests for the Portfolio API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@test.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.stock = UserStock.objects.create(
            user=self.user,
            symbol='AAPL',
            company_name='Apple Inc.',
            shares=10,
            purchase_price=150.00,
            purchase_date=date(2024, 1, 1),
            sector='Technology',
            country='United States',
            currency='USD'
        )
    
    def test_get_stocks_list(self):
        url = '/api/portfolio/stocks/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['symbol'], 'AAPL')
    
    def test_get_stocks_unauthenticated(self):
        self.client.force_authenticate(user=None)
        url = '/api/portfolio/stocks/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_delete_stock(self):
        url = f'/api/portfolio/stocks/{self.stock.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(UserStock.objects.filter(user=self.user).count(), 0)
    
    def test_delete_nonexistent_stock(self):
        url = '/api/portfolio/stocks/99999/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_user_isolation_stocks(self):
        """User A cannot see User B's stocks - CRITICAL SECURITY TEST"""
        user2 = User.objects.create_user(
            email='user2@test.com',
            password='pass2'
        )
        stock2 = UserStock.objects.create(
            user=user2,
            symbol='MSFT',
            company_name='Microsoft',
            shares=5,
            purchase_price=200.00,
            purchase_date=date(2024, 1, 1),
            sector='Technology',
            country='United States',
            currency='USD'
        )
        
        response = self.client.get('/api/portfolio/stocks/')
        
        symbols = [stock['symbol'] for stock in response.data]
        self.assertNotIn('MSFT', symbols)
        self.assertIn('AAPL', symbols)


class PropertyAPITests(TestCase):
    """Tests for Property API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@test.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.property = Property.objects.create(
            user=self.user,
            property_type='Apartment',
            address='SW1A 1AA',
            purchase_price=500000.00,
            ownership_percentage=100.00,
            monthly_rent=2000.00
        )
    
    def test_get_properties_list(self):
        url = '/api/portfolio/properties/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['property_type'], 'Apartment')
    
    def test_create_property_success(self):
        url = '/api/portfolio/properties/'
        data = {
            'property_type': 'House',
            'address': 'NW3 4BT',
            'purchase_price': 750000.00,
            'ownership_percentage': 50.00,
            'monthly_rent': 3000.00
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Property.objects.filter(user=self.user).count(), 2)
    
    def test_create_property_invalid_ownership(self):
        url = '/api/portfolio/properties/'
        data = {
            'property_type': 'House',
            'address': 'NW3 4BT',
            'purchase_price': 750000.00,
            'ownership_percentage': 150.00,  # Invalid > 100
            'monthly_rent': 3000.00
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_create_property_invalid_price(self):
        url = '/api/portfolio/properties/'
        data = {
            'property_type': 'House',
            'address': 'NW3 4BT',
            'purchase_price': -1000,  # Invalid negative
            'ownership_percentage': 100.00,
            'monthly_rent': 3000.00
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_delete_property(self):
        url = f'/api/portfolio/properties/{self.property.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Property.objects.filter(user=self.user).count(), 0)
    
    def test_delete_nonexistent_property(self):
        url = '/api/portfolio/properties/99999/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_user_isolation_properties(self):
        """User A cannot see User B's properties - CRITICAL SECURITY TEST"""
        user2 = User.objects.create_user(
            email='user2@test.com',
            password='pass2'
        )
        property2 = Property.objects.create(
            user=user2,
            property_type='Mansion',
            address='W1J 7NT',
            purchase_price=2000000.00,
            monthly_rent=10000.00
        )
        
        response = self.client.get('/api/portfolio/properties/')
        
        addresses = [prop['address'] for prop in response.data]
        self.assertNotIn('W1J 7NT', addresses)
        self.assertIn('SW1A 1AA', addresses)
    
    def test_property_unauthenticated(self):
        self.client.force_authenticate(user=None)
        url = '/api/portfolio/properties/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PortfolioSummaryTests(TestCase):
    """Tests for the portfolio summary endpoint"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@test.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    @patch('portfolio.models.UserStock.get_current_price')
    def test_portfolio_summary_with_stocks(self, mock_get_price):
        mock_get_price.return_value = 100.00
        UserStock.objects.create(
            user=self.user,
            symbol='AAPL',
            shares=10,
            purchase_price=90.00,
            currency='USD'
        )
        url = '/api/portfolio/summary/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['stocks_count'], 1)
        self.assertEqual(response.data['total_value'], 1000.00)
        self.assertEqual(response.data['total_cost'], 900.00)
    
    def test_portfolio_summary_empty(self):
        url = '/api/portfolio/summary/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['stocks_count'], 0)
        self.assertEqual(response.data['total_value'], 0)
        self.assertEqual(response.data['total_cost'], 0)
    
    def test_portfolio_summary_with_geographic_breakdown(self):
        UserStock.objects.create(
            user=self.user,
            symbol='AAPL',
            shares=10,
            purchase_price=100,
            currency='USD',
            country='United States'
        )
        UserStock.objects.create(
            user=self.user,
            symbol='SONY',
            shares=5,
            purchase_price=50,
            currency='JPY',
            country='Japan'
        )
        
        with patch('portfolio.models.UserStock.get_current_price') as mock_price:
            mock_price.return_value = 150
            
            response = self.client.get('/api/portfolio/summary/')
            
            self.assertEqual(len(response.data['geographic_breakdown']), 2)
            countries = [item['region'] for item in response.data['geographic_breakdown']]
            self.assertIn('United States', countries)
            self.assertIn('Japan', countries)


class StockHistoryTests(TestCase):
    """Tests for stock history endpoint"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@test.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.stock = UserStock.objects.create(
            user=self.user,
            symbol='AAPL',
            shares=10,
            purchase_price=150.00,
            purchase_date=date(2024, 1, 1),
            currency='USD'
        )
    
    @patch('portfolio.views.yf.Ticker')
    def test_stock_history_success(self, mock_ticker):
        """Test successful retrieval of stock price history"""
        import pandas as pd
        
        mock_instance = MagicMock()
        
        # Create a real DataFrame with proper structure
        dates = pd.date_range('2024-01-02', periods=3)
        mock_df = pd.DataFrame({
            'Close': [152.50, 155.00, 153.75]
        }, index=dates)
        
        mock_instance.history.return_value = mock_df
        mock_ticker.return_value = mock_instance
        
        url = f'/api/portfolio/stocks/{self.stock.id}/history/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['symbol'], 'AAPL')
        self.assertIn('history', response.data)
        self.assertEqual(len(response.data['history']), 3)
        self.assertEqual(response.data['history'][0]['price'], 152.50)
    
    def test_stock_history_no_purchase_date(self):
        """Test history endpoint when stock has no purchase date"""
        stock_no_date = UserStock.objects.create(
            user=self.user,
            symbol='GOOGL',
            shares=10,
            purchase_price=100.00,
            purchase_date=None
        )
        
        url = f'/api/portfolio/stocks/{stock_no_date.id}/history/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 400)
        self.assertIn('No purchase date', response.data['error'])
    
    def test_stock_history_nonexistent_stock(self):
        """Test history endpoint with invalid stock ID"""
        url = '/api/portfolio/stocks/99999/history/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 404)
    
    def test_stock_history_user_isolation(self):
        """User cannot access another user's stock history"""
        user2 = User.objects.create_user(
            email='hacker@test.com',
            password='hackpass'
        )
        stock2 = UserStock.objects.create(
            user=user2,
            symbol='MSFT',
            shares=5,
            purchase_price=200.00,
            purchase_date=date(2024, 1, 1)
        )
        
        url = f'/api/portfolio/stocks/{stock2.id}/history/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, 404)


class SearchEndpointTests(TestCase):
    """Tests for stock search endpoint"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@test.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    @patch('portfolio.views.yf.Search')
    def test_search_symbols_success(self, mock_search):
        """Test successful symbol search"""
        mock_search.return_value.quotes = [
            {'symbol': 'AAPL', 'shortname': 'Apple Inc.'},
            {'symbol': 'MSFT', 'shortname': 'Microsoft Corp.'},
            {'symbol': 'GOOGL', 'shortname': 'Alphabet Inc.'}
        ]
        
        response = self.client.get('/api/portfolio/search/?q=apple')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 3)
        self.assertEqual(response.data[0]['symbol'], 'AAPL')
    
    def test_search_empty_query(self):
        """Test search with empty query"""
        response = self.client.get('/api/portfolio/search/?q=')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
    
    def test_search_no_results(self):
        """Test search with no matches"""
        response = self.client.get('/api/portfolio/search/?q=xyz123nonexistent')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
    
    def test_search_unauthenticated(self):
        """Test search without authentication"""
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/portfolio/search/?q=AAPL')
        self.assertEqual(response.status_code, 401)


class CurrencyConversionTests(TestCase):
    """Tests for currency conversion functions"""
    
    def test_convert_same_currency(self):
        from portfolio.views import convert_currency
        result = convert_currency(100, 'USD', 'USD')
        self.assertEqual(result, 100)
    
    @patch('portfolio.views.requests.get')
    def test_convert_usd_to_eur(self, mock_get):
        from portfolio.views import convert_currency
        mock_response = MagicMock()
        mock_response.json.return_value = {'rates': {'EUR': 0.85}}
        mock_get.return_value = mock_response
        result = convert_currency(100, 'USD', 'EUR')
        self.assertAlmostEqual(result, 85.00, places=2)
    
    @patch('portfolio.views.requests.get')
    def test_convert_gbp_to_usd(self, mock_get):
        from portfolio.views import convert_currency
        mock_response = MagicMock()
        mock_response.json.return_value = {'rates': {'USD': 1.25}}
        mock_get.return_value = mock_response
        result = convert_currency(100, 'GBP', 'USD')
        self.assertAlmostEqual(result, 125.00, places=2)
    
    @patch('portfolio.views.requests.get')
    def test_get_exchange_rate_caching(self, mock_get):
        """Test that exchange rates are cached"""
        from portfolio.views import get_exchange_rate
        from django.core.cache import cache
        
        # Clear cache first
        cache.clear()
        
        mock_response = MagicMock()
        mock_response.json.return_value = {'rates': {'EUR': 0.85}}
        mock_get.return_value = mock_response
        
        # First call - should hit API
        rate1 = get_exchange_rate('USD', 'EUR')
        
        # Second call - should use cache
        rate2 = get_exchange_rate('USD', 'EUR')
        
        # Both rates should be the same
        self.assertEqual(rate1, rate2)
        self.assertAlmostEqual(rate1, 0.85, places=2)
        
        # API should be called at least once (caching works)
        self.assertGreaterEqual(mock_get.call_count, 1)
    
    @patch('portfolio.views.requests.get')
    def test_convert_currency_api_failure(self, mock_get):
        """Test fallback when API fails"""
        from portfolio.views import convert_currency
        
        mock_get.side_effect = Exception('API Error')
        
        # Should return original amount as fallback
        result = convert_currency(100, 'USD', 'EUR')
        self.assertEqual(result, 100)
    
    @patch('portfolio.views.requests.get')
    def test_convert_zero_amount(self, mock_get):
        """Test conversion with zero amount"""
        from portfolio.views import convert_currency
        result = convert_currency(0, 'USD', 'EUR')
        self.assertEqual(result, 0)


class CountryNormalizationTests(TestCase):
    """Tests for country name normalization"""
    
    def test_normalize_us_country(self):
        from portfolio.views import _normalize_country
        self.assertEqual(_normalize_country('US'), 'United States')
        self.assertEqual(_normalize_country('USA'), 'United States')
    
    def test_normalize_uk_country(self):
        from portfolio.views import _normalize_country
        self.assertEqual(_normalize_country('GB'), 'United Kingdom')
        self.assertEqual(_normalize_country('UK'), 'United Kingdom')
    
    def test_normalize_other_country(self):
        from portfolio.views import _normalize_country
        self.assertEqual(_normalize_country('Canada'), 'Canada')
    
    def test_normalize_empty_country(self):
        from portfolio.views import _normalize_country
        self.assertEqual(_normalize_country(''), 'Other')
        self.assertEqual(_normalize_country(None), 'Other')


class AddStockEdgeCasesTests(TestCase):
    """Tests for edge cases when adding stocks"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@test.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    @patch('portfolio.views._get_close_price_on_or_before')
    @patch('portfolio.views.yf.Ticker')
    def test_add_duplicate_stock_allowed(self, mock_ticker, mock_price):
        """Test that duplicate stocks are allowed (your app allows multiple entries)"""
        mock_price.return_value = 150.00
        
        mock_instance = MagicMock()
        mock_instance.info = {
            'longName': 'Apple Inc.',
            'sector': 'Technology',
            'country': 'US',
            'currency': 'USD'
        }
        mock_ticker.return_value = mock_instance
        
        # Add first stock
        data = {
            'symbol': 'AAPL',
            'shares': 10,
            'purchase_date': '2024-01-01'
        }
        response1 = self.client.post('/api/portfolio/stocks/', data, format='json')
        self.assertEqual(response1.status_code, 201)
        
        # Try to add duplicate - Your app allows duplicates
        response2 = self.client.post('/api/portfolio/stocks/', data, format='json')
        self.assertEqual(response2.status_code, 201)
        
        # Verify both stocks exist
        stocks = UserStock.objects.filter(user=self.user, symbol='AAPL')
        self.assertEqual(stocks.count(), 2)
    
    @patch('portfolio.views._get_close_price_on_or_before')
    def test_add_stock_invalid_date_format(self, mock_price):
        """Test invalid date format handling"""
        data = {
            'symbol': 'AAPL',
            'shares': 10,
            'purchase_date': 'invalid-date'
        }
        response = self.client.post('/api/portfolio/stocks/', data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid date format', str(response.data))
    
    @patch('portfolio.views._get_close_price_on_or_before')
    def test_add_stock_missing_date(self, mock_price):
        """Test missing purchase date"""
        data = {
            'symbol': 'AAPL',
            'shares': 10
        }
        response = self.client.post('/api/portfolio/stocks/', data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('required', str(response.data))
    
    @patch('portfolio.views._get_close_price_on_or_before')
    def test_add_stock_cannot_fetch_price(self, mock_price):
        """Test when historical price cannot be fetched"""
        mock_price.return_value = None
        
        data = {
            'symbol': 'INVALID',
            'shares': 10,
            'purchase_date': '2024-01-01'
        }
        response = self.client.post('/api/portfolio/stocks/', data, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('Could not fetch historical price', str(response.data))


class PortfolioNewsTests(TestCase):
    """Tests for portfolio news endpoint"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@test.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
        
        self.stock = UserStock.objects.create(
            user=self.user,
            symbol='AAPL',
            shares=10,
            purchase_price=150.00,
            company_name='Apple Inc.'
        )
    
    @patch('portfolio.views.yf.Ticker')
    def test_portfolio_news_success(self, mock_ticker):
        """Test successful news retrieval"""
        mock_instance = MagicMock()
        mock_instance.news = [
            {
                'content': {
                    'title': 'Apple Stock Rises',
                    'canonicalUrl': {'url': 'http://example.com/1'},
                    'provider': {'displayName': 'Bloomberg'},
                    'pubDate': '2024-01-15T10:00:00Z',
                    'thumbnail': {'resolutions': [{'url': 'http://example.com/img.jpg'}]}
                }
            }
        ]
        mock_ticker.return_value = mock_instance
        
        response = self.client.get('/api/portfolio/news/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['related_symbol'], 'AAPL')
    
    def test_portfolio_news_empty_portfolio(self):
        """Test news for empty portfolio"""
        # Delete all stocks
        UserStock.objects.all().delete()
        
        response = self.client.get('/api/portfolio/news/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])
        