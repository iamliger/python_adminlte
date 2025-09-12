# baccara_analyse/api/views.py

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from django.contrib.sessions.models import Session
from django.contrib.auth import get_user_model
from django.utils import timezone
from game_data.models import (
    BroadcastMessage,
    BaccaraDB,
    BaccaraConfig,
    ThreeTicket,
    FourTicket,
    FiveTicket,
    SixTicket,
)
from baccara_analyse.core_utils import global_debug_log
from api.game_logic import (
    process_logic1,
    process_logic2,
    process_logic3,
    process_logic4,
    process_ai_logic,
    run_all_virtual_analytics,
    build_current_state_response,
)

User = get_user_model()


class TestDataAPIView(APIView):
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
        global_debug_log(f"TestDataAPIView: Received data: {received_data}")

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
                global_debug_log(
                    f"세션 디코딩 오류: {session.session_key} - {e}", exc_info=True
                )
                continue

        return Response(
            {
                "success": True,
                "message": f"{target_user.username} 사용자의 활성 세션 {deleted_count}개를 삭제했습니다.",
            },
            status=status.HTTP_200_OK,
        )


class HeartbeatAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if request.session.session_key:
            request.session.modified = True
            global_debug_log(
                f"Heartbeat: 사용자 {request.user.username}의 세션 {request.session.session_key} 갱신됨."
            )
            return Response(
                {"success": True, "message": "세션이 갱신되었습니다."},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"success": False, "message": "유효한 세션이 없습니다."},
                status=status.HTTP_400_BAD_REQUEST,
            )


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
            return Response(status=status.HTTP_204_NO_CONTENT)


class ProcessGameResultAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user

        selected_logic_from_frontend = request.query_params.get(
            "selectedLogic", "logic1"
        )
        global_debug_log(
            f"ProcessGameResultAPIView: GET 요청 수신 - user={user.username}, selectedLogic from frontend={selected_logic_from_frontend}"
        )

        if not user.is_authenticated:
            return Response(
                {"success": False, "message": "로그인이 필요합니다."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            # BaccaraDB 인스턴스 로드 또는 생성
            bacara_db, _ = BaccaraDB.objects.get_or_create(
                user=user, defaults={"memberid": user.username}
            )
            if bacara_db.memberid != user.username:
                bacara_db.memberid = user.username
                bacara_db.save(update_fields=["memberid"])

            # BaccaraDB에 저장된 selected_logic을 현재 요청에 맞게 업데이트 (선택 사항)
            # 만약 백엔드가 프론트엔드에서 받은 selected_logic을 영구 저장하길 원한다면
            if bacara_db.selected_logic != selected_logic_from_frontend:
                bacara_db.selected_logic = selected_logic_from_frontend
                bacara_db.save(update_fields=["selected_logic", "updated_at"])
                global_debug_log(
                    f"BaccaraDB.selected_logic 업데이트 완료 (GET 요청): {selected_logic_from_frontend}"
                )

            # build_current_state_response 함수가 bcdata, logic_state 등을 알아서 처리합니다.
            # GET 요청 시에는 프론트엔드에서 전달받은 selected_logic_from_frontend를 사용합니다.
            current_state_response = build_current_state_response(
                user,
                bacara_db.bcdata if bacara_db.bcdata else "",
                selected_logic_from_frontend,
            )

            global_debug_log(
                f"ProcessGameResultAPIView: GET 요청 응답 - user={user.username}, current_state_response={current_state_response}"
            )
            return Response(
                {"success": True, "currentState": current_state_response},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            global_debug_log(
                f"ProcessGameResultAPIView (GET) 처리 중 오류 발생: user={user.username}, 오류={e}",
                exc_info=True,
            )
            return Response(
                {
                    "success": False,
                    "message": f"초기 게임 데이터 로드 중 오류 발생: {e}",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def post(self, request, *args, **kwargs):
        user = request.user
        game_action = request.data.get("action")
        game_data = request.data.get("data")
        selected_logic = request.data.get("selectedLogic", "logic1")
        ai_betting_enabled_client = request.data.get("aiBettingEnabled", False)

        global_debug_log(
            f"ProcessGameResultAPIView: POST 요청 수신 - user={user.username}, action={game_action}, data={game_data}, selected_logic={selected_logic}, ai_client_enabled={ai_betting_enabled_client}"
        )

        if not user.is_authenticated:
            return Response(
                {"success": False, "message": "로그인이 필요합니다."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not game_action:
            return Response(
                {"success": False, "message": "필수 정보가 없습니다 (action)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # CustomUser의 username과 BaccaraDB의 memberid를 매칭하여 인스턴스 가져오기
            bacara_db, created = BaccaraDB.objects.get_or_create(
                user=user, defaults={"memberid": user.username}
            )
            if bacara_db.memberid != user.username:
                bacara_db.memberid = user.username
                bacara_db.save(update_fields=["memberid"])

            current_bcdata = bacara_db.bcdata if bacara_db.bcdata else ""

            updated_bcdata = current_bcdata

            # ----------------------------------------------------
            # 새로운 액션 타입 추가: 'update_logic_selection'
            # ----------------------------------------------------
            if game_action == "update_logic_selection":
                if bacara_db.selected_logic != selected_logic:
                    bacara_db.selected_logic = selected_logic
                    bacara_db.save(update_fields=["selected_logic", "updated_at"])
                    global_debug_log(
                        f"사용자 {user.username}의 선택 로직이 {selected_logic}으로 업데이트됨."
                    )
                return Response(
                    {
                        "success": True,
                        "message": f"선택 로직이 {selected_logic}으로 업데이트되었습니다.",
                    },
                    status=status.HTTP_200_OK,
                )
            # ----------------------------------------------------

            if game_action == "addjokbo":
                if not game_data:
                    return Response(
                        {
                            "success": False,
                            "message": "게임 데이터 (P/B/T)가 필요합니다.",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                updated_bcdata = current_bcdata + game_data
                bacara_db.bcdata = updated_bcdata
                bacara_db.save(update_fields=["bcdata", "updated_at"])
                global_debug_log(
                    f"bcdata 업데이트 완료: user={user.username}, new_bcdata={updated_bcdata}"
                )
                global_debug_log(
                    f"사용자 ID: {user.username}, 선택 로직: {selected_logic}을(를) 선택했습니다."
                )  # <-- 추가된 디버깅 로그

            elif game_action == "undo":
                if current_bcdata:
                    updated_bcdata = current_bcdata[:-1]
                    bacara_db.bcdata = updated_bcdata
                    bacara_db.save(update_fields=["bcdata", "updated_at"])
                    global_debug_log(
                        f"bcdata undo 완료: user={user.username}, new_bcdata={updated_bcdata}"
                    )
                else:
                    return Response(
                        {"success": False, "message": "취소할 족보가 없습니다."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            elif game_action == "reset":
                bacara_db.bcdata = ""
                bacara_db.logic_state = {}
                bacara_db.pattern_stats = {}
                bacara_db.chartResult = {}
                bacara_db.virtual_stats = {}
                bacara_db.game_history = []
                bacara_db.Pattern_3 = []
                bacara_db.Pattern_4 = []
                bacara_db.Pattern_5 = []
                bacara_db.Pattern_6 = []
                bacara_db.save()

                ThreeTicket.objects.filter(user=user).delete()
                FourTicket.objects.filter(user=user).delete()
                FiveTicket.objects.filter(user=user).delete()
                SixTicket.objects.filter(user=user).delete()

                updated_bcdata = ""
                global_debug_log(f"사용자 데이터 초기화 완료: user={user.username}")

            else:
                return Response(
                    {"success": False, "message": "알 수 없는 요청입니다."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            final_predictions = []
            ai_prediction_info = None
            all_logic_states = {}

            baccara_config = BaccaraConfig.load()
            global_ai_enabled = baccara_config.ai_logic_enabled

            if updated_bcdata:
                logic1_results = process_logic1(
                    user, updated_bcdata, should_update_stats=True
                )
                logic2_result = process_logic2(
                    user,
                    updated_bcdata,
                    bacara_db.logic_state,
                    should_update_stats=True,
                )
                all_logic_states["logic2"] = logic2_result["next_states"]
                logic3_result = process_logic3(
                    user,
                    updated_bcdata,
                    bacara_db.logic_state,
                    should_update_stats=True,
                )
                all_logic_states["logic3"] = logic3_result["next_states"]
                logic4_result = process_logic4(
                    user,
                    updated_bcdata,
                    bacara_db.logic_state,
                    should_update_stats=True,
                )
                all_logic_states["logic4"] = logic4_result["next_states"]

                bacara_db.logic_state = all_logic_states
                bacara_db.save(update_fields=["logic_state", "updated_at"])
                global_debug_log(
                    f"BaccaraDB.logic_state 업데이트 완료: user={user.username}, states={all_logic_states}"
                )

            if global_ai_enabled and ai_betting_enabled_client:
                ai_prediction_info = process_ai_logic(
                    user, updated_bcdata, bacara_db.logic_state, baccara_config
                )
                global_debug_log(f"AI 로직 실행 및 예측 생성: {ai_prediction_info}")

            current_state_response = build_current_state_response(
                user, updated_bcdata, selected_logic
            )

            response_data = {
                "success": True,
                "currentState": current_state_response,
                "aiPrediction": ai_prediction_info,
                "selectedLogic": selected_logic,
            }
            return Response(response_data, status=status.HTTP_200_OK)

        except User.DoesNotExist:
            return Response(
                {"success": False, "message": "사용자를 찾을 수 없습니다."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except BaccaraDB.DoesNotExist:
            return Response(
                {
                    "success": False,
                    "message": "사용자의 바카라 데이터가 없습니다. 다시 로그인해주세요.",
                },
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            global_debug_log(
                f"ProcessGameResultAPIView 처리 중 오류 발생: user={user.username}, 오류={e}",
                exc_info=True,
            )
            return Response(
                {"success": False, "message": f"게임 결과 처리 중 오류 발생: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
