# accounts/urls.py

from django.urls import path
from django.contrib.auth import views as auth_views

# from . import views # 만약 커스텀 뷰를 사용한다면

app_name = "accounts"  # 이 app_name이 namespace와 일치해야 합니다.

urlpatterns = [
    # Django 기본 로그아웃 뷰 사용 (recommended)
    path("logout/", auth_views.LogoutView.as_view(), name="logout"),
    # path('login/', auth_views.LoginView.as_view(), name='login'), # 로그인 뷰도 필요하다면 추가
    # path('logout/', views.custom_logout_view, name='logout'), # 만약 커스텀 로그아웃 뷰를 사용한다면
]
