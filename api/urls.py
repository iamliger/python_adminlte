# api/urls.py

from django.urls import path
from .views import (
    TestDataAPIView,
    ForceLogoutAPIView,
    HeartbeatAPIView,
    BroadcastMessageAPIView,
    ProcessGameResultAPIView,
)

app_name = "api"

urlpatterns = [
    path("test_data/", TestDataAPIView.as_view(), name="test_data"),
    path("force_logout/", ForceLogoutAPIView.as_view(), name="force_logout"),
    path("heartbeat/", HeartbeatAPIView.as_view(), name="heartbeat"),
    path(
        "broadcast_message/",
        BroadcastMessageAPIView.as_view(),
        name="broadcast_message",
    ),
    path(
        "process_game_result/",
        ProcessGameResultAPIView.as_view(),
        name="process_game_result",
    ),
]
