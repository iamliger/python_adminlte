# api/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import (
    IsAdminUser,
    IsAuthenticated,
)  # 관리자 권한만 허용
from django.contrib.sessions.models import Session  # Django 세션 모델 임포트
from django.contrib.auth import get_user_model
import json  # 세션 데이터를 디코딩하기 위해 필요
import datetime
from django.utils import timezone
from game_data.models import BroadcastMessage  # BroadcastMessage 모델 임포트

User = get_user_model()


class TestDataAPIView(APIView):
    # 기존 TestDataAPIView 코드는 그대로 유지
    def get(self, request, *args, **kwargs):
        test_data = {
            "message": "안녕하세요! Django 백엔드에서 온 테스트 데이터입니다.",
            "timestamp": "2023-10-27T10:00:00Z",
            "data": [
                {"id": 1, "name": "아이템 A", "value": 100},
                {"id": 2, "name": "아이템 B", "value": 200},
            ],
        }
        return Response(test_data, status=status.HTTP_200_OK)

    def post(self, request, *args, **kwargs):
        received_data = request.data
        print("Received data from React:", received_data)

        response_data = {
            "status": "success",
            "message": "데이터를 성공적으로 받았습니다.",
            "your_data": received_data,
        }
        return Response(response_data, status=status.HTTP_201_CREATED)


class ForceLogoutAPIView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, *args, **kwargs):
        target_user_id = request.data.get("user_id")

        if not target_user_id:
            return Response(
                {
                    "success": False,
                    "message": "강제 로그아웃할 사용자 ID가 필요합니다.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_user = User.objects.get(pk=target_user_id)
        except User.DoesNotExist:
            return Response(
                {"success": False, "message": "해당 사용자를 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if request.user.id == target_user.id:
            return Response(
                {
                    "success": False,
                    "message": "자기 자신을 강제 로그아웃할 수 없습니다. 대신 직접 로그아웃 해주세요.",
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        deleted_count = 0
        for session in Session.objects.all():
            try:
                session_data = session.get_decoded()
                if str(session_data.get("_auth_user_id")) == str(target_user_id):
                    session.delete()
                    deleted_count += 1
            except Exception as e:
                print(f"세션 디코딩 오류: {session.session_key} - {e}")
                continue

        return Response(
            {
                "success": True,
                "message": f"{target_user.username} 사용자의 활성 세션 {deleted_count}개를 삭제했습니다.",
            },
            status=status.HTTP_200_OK,
        )


class HeartbeatAPIView(APIView):
    # 로그인된 사용자만 접근 가능
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        # 요청을 보낸 사용자의 세션을 갱신합니다.
        # Django의 SessionMiddleware는 요청 처리 중 세션에 접근하면 자동으로 세션 만료일을 갱신합니다.
        # 명시적으로 세션을 '수정'했다고 표시하여 save()가 호출되도록 합니다.
        if request.session.session_key:
            request.session.modified = True
            # print(f"Heartbeat: 사용자 {request.user.username}의 세션 {request.session.session_key} 갱신됨.")
            return Response(
                {"success": True, "message": "세션이 갱신되었습니다."},
                status=status.HTTP_200_OK,
            )
        else:
            # 로그인했지만 세션 키가 없는 경우 (매우 드뭄)
            return Response(
                {"success": False, "message": "유효한 세션이 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )


# 새로 추가되는 부분: BroadcastMessageAPIView
class BroadcastMessageAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        active_messages = BroadcastMessage.objects.filter(is_active=True).order_by(
            "-created_at"
        )

        if active_messages.exists():
            message = active_messages.first()
            message_data = {
                "id": message.id,
                "category": message.get_category_display(),
                "category_raw": message.category,
                "message": message.message,
                "created_at": timezone.localtime(message.created_at).isoformat(),
                "created_by": (
                    message.created_by.username if message.created_by else "알 수 없음"
                ),
            }
            return Response(message_data, status=status.HTTP_200_OK)
        else:
            # 활성 메시지가 없을 때는 본문 없이 204 No Content를 반환합니다.
            return Response(
                status=status.HTTP_204_NO_CONTENT
            )  # <-- 이 부분을 수정합니다! (본문 제거)
