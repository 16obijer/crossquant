from django.urls import path
from . import views

urlpatterns = [
    path('predict-option-price/', views.api_predict_option_price, name='api_predict_option_price'),
]