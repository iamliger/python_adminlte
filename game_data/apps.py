# game_data/apps.py

from django.apps import AppConfig


class GameDataConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "game_data"
    verbose_name = "게임 데이터 관리"
