from django.urls import path
from . import views

app_name = "frontend"

urlpatterns = [
    path("baccara/", views.baccara_analyzer_view, name="baccara_analyzer"),
    path("mypage/", views.mypage_view, name="mypage"),  # <--- 더미 마이페이지 URL 추가
]
