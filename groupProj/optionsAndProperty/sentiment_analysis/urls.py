from django.urls import path
from . import views

urlpatterns = [
    path('sentiment/', views.get_sentiment),
    path('sentiment/start/', views.start_sentiment_job),
    path('sentiment/status/<str:job_id>/', views.get_sentiment_status),
    path('property/', views.get_property_sentiment),
    path('property/start/', views.start_property_sentiment_job),
    path('property/status/<str:job_id>/', views.get_property_sentiment_status),
]
