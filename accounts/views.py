# accounts/views.py (커스텀 뷰 사용 예시)

from django.shortcuts import redirect
from django.contrib.auth import logout as auth_logout
from django.urls import reverse


def custom_logout_view(request):
    auth_logout(request)
    return redirect(
        reverse("frontend:baccara_analyzer")
    )  # 로그아웃 후 리디렉션할 페이지
