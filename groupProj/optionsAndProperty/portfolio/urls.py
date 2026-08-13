from django.urls import path
from . import views

urlpatterns = [
    path('stocks/', views.stock_list, name='stock-list'),
    path('stocks/<int:pk>/', views.stock_detail, name='stock-detail'),
    path('stocks/<int:pk>/history/', views.stock_history, name='stock-history'),

    path('properties/', views.property_list, name = 'property-list'),
    path('properties/<int:pk>/', views.property_detail, name= 'property-detail'),


    path('summary/', views.portfolio_summary, name='portfolio-summary'),
    path('price/<str:symbol>/', views.check_price, name='check-price'),
    path('search/', views.search_symbols, name='search-symbols'),
    path('news/', views.portfolio_news, name='portfolio-news'),
]