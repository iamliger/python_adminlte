# baccara_analyse/urls.py

import os
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.views import serve
from django.shortcuts import redirect
from django.urls import reverse_lazy, reverse
from django.contrib.auth import get_user_model
from django.contrib import messages  # messages 임포트

# accounts 앱에서 필요한 뷰들을 임포트합니다.
from accounts.views import (
    CustomLoginView,
    CustomLogoutView,
)

User = get_user_model()


# 루트 URL 처리 뷰 함수
def root_redirect(request):
    if not request.user.is_authenticated:
        return redirect(reverse_lazy("login"))
    else:
        if request.user.level == 1:
            return redirect(reverse_lazy("accounts:approval_pending"))
        elif request.user.level == 2:
            return redirect(reverse_lazy("frontend:baccara_analyzer"))
        elif 3 <= request.user.level <= 9:
            return redirect(reverse_lazy("frontend:baccara_analyzer"))
        elif request.user.level == 10:
            return redirect(reverse_lazy("admin:index"))

    return redirect(reverse_lazy("login"))


urlpatterns = [
    path("admin/", admin.site.urls),  # Django Admin 기본 URL
    path("api/", include("api.urls")),
    path("game_data/", include("game_data.urls", namespace="game_data")),
    path("login/", CustomLoginView.as_view(), name="login"),
    path("logout/", CustomLogoutView.as_view(), name="logout"),
    path("accounts/", include("accounts.urls", namespace="accounts")),
    path("baccara/", include("frontend.urls")),
    path("", root_redirect, name="root_redirect"),
]

# 개발 환경에서만 정적 파일 제공 (운영 환경에서는 웹 서버가 처리)
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns.append(path("static/<path:path>", serve))
