from rest_framework import serializers
from .models import UserStock,Property
from django.core.cache import cache
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


class UserStockSerializer(serializers.ModelSerializer):
    current_price = serializers.SerializerMethodField()
    current_value = serializers.SerializerMethodField()
    gain_loss = serializers.SerializerMethodField()
    gain_loss_percentage = serializers.SerializerMethodField()
    purchase_price_usd = serializers.SerializerMethodField()
    
    class Meta:
        model = UserStock
        fields = ['id', 'symbol', 'company_name', 'shares', 'purchase_price', 'purchase_price_usd', 'purchase_date', 
                  'sector', 'country', 'currency', 'current_price', 'current_value', 'gain_loss', 
                  'gain_loss_percentage']
        read_only_fields = ['id']
    
    def get_purchase_price_usd(self, obj):
        """Convert purchase price to USD"""
        price = float(obj.purchase_price)
        currency = getattr(obj, 'currency', 'USD')
        return convert_currency(price, currency, 'USD')
    
    def get_current_price(self, obj):
        price = obj.get_current_price()
        currency = getattr(obj, 'currency', 'USD')
        return convert_currency(price, currency, 'USD')
    
    def get_current_value(self, obj):
        value = obj.get_current_value()
        currency = getattr(obj, 'currency', 'USD')
        return convert_currency(value, currency, 'USD')
    
    def get_gain_loss(self, obj):
        current_value = self.get_current_value(obj)
        cost_basis_usd = self.get_purchase_price_usd(obj) * float(obj.shares)
        return current_value - cost_basis_usd
    
    def get_gain_loss_percentage(self, obj):
        current_value = self.get_current_value(obj)
        cost_basis_usd = self.get_purchase_price_usd(obj) * float(obj.shares)
        if cost_basis_usd == 0:
            return 0
        return ((current_value - cost_basis_usd) / cost_basis_usd) * 100
    
class PropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = [
            'id', 
            'property_type',
            'address',
            'purchase_price',
            'ownership_percentage',
            'monthly_rent',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate_ownership_percentage(self,value):
        if value<=0 or value >100:
            raise serializers.ValidationError('Ownership must be between 0 and 100')
        return value
    
    def validate_purchase_price(self,value):
        if value<=0: 
            raise serializers.ValidationError('Purchase price must be greater than 0.')
        return value
    
    def validate_monthly_rent(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('Monthly rent cannot be negative.')
        return value