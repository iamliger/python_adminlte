import os
from django.contrib import admin
from django.urls import path, include
from django.conf import settings  # Static files
from django.conf.urls.static import static  # Static files
from django.contrib.staticfiles.views import serve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),  # API 앱의 URL을 include
    path("", include("frontend.urls")),
    path("accounts/", include("accounts.urls", namespace="accounts")),
    # path("game_data/", include("game_data.urls")), # game_data 앱의 urls.py 가 있다면 포함시켜 줍니다.
]

# 개발 환경에서만 정적 파일 제공 (운영 환경에서는 웹 서버가 처리)
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns.append(path("static/<path:path>", serve))
