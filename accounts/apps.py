from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"
    verbose_name = "계정 및 사용자 관리"  # Admin에서 보여질 앱 이름 (선택 사항)
