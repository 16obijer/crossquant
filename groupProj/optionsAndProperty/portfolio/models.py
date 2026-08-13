from django.db import models
from django.conf import settings
import yfinance as yf

class UserStock(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    symbol = models.CharField(max_length=10)
    company_name = models.CharField(max_length=100, blank=True)
    shares = models.DecimalField(max_digits=15, decimal_places=2)
    purchase_price = models.DecimalField(max_digits=15, decimal_places=2)
    purchase_date = models.DateField(null=True, blank=True)
    sector = models.CharField(max_length=50, blank=True)
    country = models.CharField(max_length=50, blank=True)
    currency = models.CharField(max_length=3, default='USD', blank=True)
    
    def __str__(self):
        return f"{self.user.email} - {self.symbol}"
    
    def get_current_price(self):
        """Get current market price for this stock"""
        try:
            ticker = yf.Ticker(self.symbol)
            info = ticker.info
            price = info.get('regularMarketPrice', info.get('currentPrice', info.get('previousClose', 0)))
            return float(price) if price else 0
        except:
            return 0
    
    def get_current_value(self):
        """Get current total value of this position"""
        return float(self.shares) * self.get_current_price()
    
    def get_cost_basis(self):
        """Get total cost of this position"""
        return float(self.shares) * float(self.purchase_price)

class Property(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='properties')
    property_type = models.CharField(max_length=100)
    address = models.TextField()
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2)
    ownership_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100)
    monthly_rent = models.DecimalField(max_digits=10,decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.property_type}-{self.address}'