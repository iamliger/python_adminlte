# api/urls.py
from django.urls import path
from .views import TestDataAPIView

urlpatterns = [
    path("test_data/", TestDataAPIView.as_view(), name="test_data"),
]
