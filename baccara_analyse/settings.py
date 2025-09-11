# baccara_analyse/settings.py

import os
from pathlib import Path
from django.urls import reverse_lazy

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_ROOT = os.path.join(BASE_DIR, "staticfiles_collected")

LOCALE_PATHS = [os.path.join(BASE_DIR, "locale")]

SECRET_KEY = "django-insecure-cnn_6tt)m0umf3gh&=mf43&&69abdw_sp85%3knmh20uf*w6(8"

DEBUG = True

ALLOWED_HOSTS = ["*"]

AUTH_USER_MODEL = "accounts.CustomUser"

INSTALLED_APPS = [
    "jazzmin",  # <-- 이 줄이 반드시 맨 처음에 와야 합니다! (Jazzmin 테마 로딩 최우선)
    "django.contrib.admin",  # Admin 앱은 Jazzmin 바로 다음에 오는 것이 일반적
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_json_widget",  # JSON 위젯 라이브러리
    "accounts.apps.AccountsConfig",
    "game_data.apps.GameDataConfig",
    "rest_framework",
    "api",
    "corsheaders",
    "frontend",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8199",
    "http://127.0.0.1:8199",
]

CORS_ALLOW_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

CORS_ALLOW_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
]

ROOT_URLCONF = "baccara_analyse.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "baccara_analyse.core_utils.debug_context_processor",
            ],
        },
    },
]

WSGI_APPLICATION = "baccara_analyse.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": "baccara_db",
        "USER": "root",
        "PASSWORD": "liger!@34",
        "HOST": "localhost",
        "PORT": "3307",
    }
}

AUTH_PASSWORD_VALIDATORS = []

LOGIN_URL = "/login/"
LOGIN_REDIRECT_URL = "/login/"
LOGOUT_REDIRECT_URL = "/login/"

AUTHENTICATION_BACKENDS = [
    "accounts.backends.EmailBackend",
    "django.contrib.auth.backends.ModelBackend",
]

LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"
USE_I18N = True
USE_L10N = True  # 지역화 활성화 (숨겨진 설정 주의!)
USE_TZ = True

STATIC_URL = "static/"
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, "frontend", "static"),
    os.path.join(BASE_DIR, "accounts", "static"),
]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# =========================================================================
# JAZZMIN SETTINGS
# =========================================================================
JAZZMIN_SETTINGS = {
    "site_title": "바카라 분석기 Admin",
    "site_header": "바카라 Admin",
    "welcome_sign": "바카라 분석기 관리자 페이지에 오신 것을 환영합니다.",
    "copyright": "Liger",
    "user_icon": "fas fa-user",
    "changeform_format": "horizontal_tabs",
    "custom_css": None,
    "custom_js": None,
    "show_ui_tweaks": True,
    "custom_links": {
        "accounts": [
            {
                "name": "현재 접속중인 사용자",
                "url": "admin:accounts_currently_logged_in_users",
                "icon": "fas fa-users-line",
                "permissions": ["auth.view_user"],
            }
        ],
        "game_data": [
            {
                "name": "바카라 전역 설정",
                "url": "admin:game_data_baccaraconfig_change",
                "icon": "fas fa-cogs",
                "permissions": ["game_data.view_baccaraconfig"],
            },
            # "게임로직" 카테고리를 위한 로직2, 로직3 링크 (향후 활성화 예정)
            # {
            #     "name": "로직2 패턴 관리",
            #     "url": "admin:game_data_logic2_patterns_manage", # 가상의 URL 이름
            #     "icon": "fas fa-dice",
            #     "permissions": ["game_data.view_baccaraconfig"],
            # },
            # {
            #     "name": "로직3 패턴 관리",
            #     "url": "admin:game_data_logic3_patterns_manage", # 가상의 URL 이름
            #     "icon": "fas fa-th-list",
            #     "permissions": ["game_data.view_baccaraconfig"],
            # },
        ],
    },
    "usermenu_links": [
        # {
        #     "name": "내 프로필 보기",
        #     "url": "admin:auth_user_change",
        #     "icon": "fas fa-user-circle",
        #     "new_window": False,
        # },
        # # 비밀번호 변경 링크 추가
        # {
        #     "name": "비밀번호 변경",
        #     "url": "admin:password_change",
        #     "icon": "fas fa-key",
        # },
    ],
    "order_with_respect_to": ["accounts", "game_data", "auth", "api", "frontend"],
    "icons": {
        "accounts.CustomUser": "fas fa-users",
        "auth.Group": "fas fa-user-group",
        "game_data.BroadcastMessage": "fas fa-bullhorn",
        "game_data.BaccaraConfig": "fas fa-cogs",
        "game_data.BaccaraDB": "fas fa-database",
        "game_data.ThreeTicket": "fas fa-dice-one",
        "game_data.FourTicket": "fas fa-dice-two",
        "game_data.FiveTicket": "fas fa-dice-three",
        "game_data.SixTicket": "fas fa-dice-four",
        "game_data.ClsLog": "fas fa-clipboard-list",
    },
    "hide_models": [
        "game_data.BaccaraDB",
        "game_data.ThreeTicket",
        "game_data.FourTicket",
        "game_data.FiveTicket",
        "game_data.SixTicket",
        "game_data.ClsLog",
        "game_data.BaccaraConfig",
    ],
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-dark",
    "accent": "accent-primary",
    "navbar": "navbar-dark navbar-primary",
    "no_navbar_border": False,
    "navbar_fixed": False,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": False,
    "sidebar": "sidebar-dark-primary",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": False,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "darkly",
    "dark_mode_theme": "darkly",
    "button_classes": {
        "primary": "btn-outline-primary",
        "secondary": "btn-outline-secondary",
        "info": "btn-outline-info",
        "warning": "btn-outline-warning",
        "danger": "btn-outline-danger",
        "success": "btn-outline-success",
    },
}

# =========================================================================
# DJANGO JSON WIDGET SETTINGS
# =========================================================================
JSON_EDITOR_JS = (
    "https://cdnjs.cloudflare.com/ajax/libs/jsoneditor/9.10.2/jsoneditor.min.js"
)
JSON_EDITOR_CSS = (
    "https://cdnjs.cloudflare.com/ajax/libs/jsoneditor/9.10.2/jsoneditor.min.css"
)
