from django.urls import path
from . import views

app_name = "frontend"

urlpatterns = [
    path("baccara/", views.baccara_analyzer_view, name="baccara_analyzer"),
]
