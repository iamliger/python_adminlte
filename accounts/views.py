# accounts/views.py

from django.contrib.auth.views import LoginView, LogoutView
from django.shortcuts import render, redirect
from django.urls import reverse_lazy, reverse
from django.views.generic import CreateView, TemplateView, View
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from .forms import CustomUserCreationForm, CustomAuthenticationForm
from django.contrib.sessions.models import Session
import json
import datetime
from django.utils import timezone
from django.contrib import admin  # admin 모듈 임포트
from game_data.models import BaccaraConfig
from django.contrib import messages
from baccara_analyse.core_utils import global_debug_log  # <-- 전역 디버깅 함수 임포트
import re  # 정규표현식 임포트
from django.conf import settings


User = get_user_model()


class CustomLoginView(LoginView):
    template_name = "accounts/login.html"
    form_class = CustomAuthenticationForm
    redirect_authenticated_user = True

    def get_success_url(self):
        user = self.request.user
        if user.is_authenticated:
            if user.level == 1:
                return reverse_lazy("accounts:approval_pending")
            elif user.level == 2:
                return reverse_lazy("frontend:baccara_analyzer")
            elif 3 <= user.level <= 9:
                return reverse_lazy("frontend:baccara_analyzer")
            elif user.level == 10:
                return reverse_lazy("admin:index")
        return reverse_lazy("login")


class CustomLogoutView(LogoutView):
    pass


class RegisterView(CreateView):
    model = User
    form_class = CustomUserCreationForm
    template_name = "accounts/register.html"
    success_url = reverse_lazy("login")

    def form_valid(self, form):
        user = form.save(commit=False)
        user.level = 1
        user.save()
        return super().form_valid(form)


@method_decorator(login_required(login_url=reverse_lazy("login")), name="dispatch")
class ApprovalPendingView(TemplateView):
    template_name = "accounts/approval_pending.html"

    def dispatch(self, request, *args, **kwargs):
        if request.user.level > 1:
            if request.user.level == 2:
                return redirect(reverse_lazy("frontend:baccara_analyzer"))
            elif 3 <= request.user.level <= 9:
                return redirect(reverse_lazy("frontend:baccara_analyzer"))
            elif request.user.level == 10:
                return redirect(reverse_lazy("admin:index"))
        return super().dispatch(request, *args, **kwargs)


@method_decorator(login_required(login_url=reverse_lazy("login")), name="dispatch")
@method_decorator(
    admin.site.admin_view, name="dispatch"
)  # Admin 권한 확인 및 컨텍스트 주입
class CurrentlyLoggedInUsersView(View):
    template_name = "admin/currently_logged_in_users.html"

    def get(self, request, *args, **kwargs):
        active_sessions = Session.objects.filter(expire_date__gte=timezone.now())
        logged_in_users_data = []

        for session in active_sessions:
            try:
                session_data = session.get_decoded()
                user_id = session_data.get("_auth_user_id")

                if user_id:
                    user = User.objects.get(pk=user_id)
                    if user.id == request.user.id:
                        continue
                    logged_in_users_data.append(
                        {
                            "id": user.id,
                            "username": user.username,
                            "email": user.email,
                            "last_login": user.last_login if user.last_login else "N/A",
                        }
                    )
            except (KeyError, User.DoesNotExist, Exception) as e:
                global_debug_log(
                    f"세션 또는 사용자 조회 오류: {session.session_key} - {e}"
                )
                continue

        unique_users = {user["id"]: user for user in logged_in_users_data}.values()

        context = {
            "title": "현재 접속중인 사용자",
            "currently_logged_in_users": sorted(
                list(unique_users), key=lambda x: x["username"]
            ),
            "force_logout_api_url": reverse_lazy("api:force_logout"),
        }
        return render(request, self.template_name, context)


@method_decorator(login_required(login_url=reverse_lazy("login")), name="dispatch")
@method_decorator(
    admin.site.admin_view, name="dispatch"
)  # Admin 권한 확인 및 컨텍스트 주입
class Logic3PatternManagementView(View):
    template_name = "admin/logic3_patterns_manage.html"

    def get(self, request, *args, **kwargs):
        global_debug_log(
            "\n--- Logic3PatternManagementView: GET 요청 수신 ---"
        )  # 디버깅
        config = BaccaraConfig.load()
        logic3_patterns = config.logic3_patterns

        global_debug_log(
            f"로드된 BaccaraConfig.logic3_patterns: {logic3_patterns}"
        )  # 디버깅

        if not logic3_patterns or not isinstance(logic3_patterns, dict):
            logic3_patterns = {"pattern_count": 1, "sequences": [[1, 1, 1, 1, 1, 1, 1]]}
            global_debug_log(
                "Logic3 patterns가 없거나 형식이 잘못되어 기본값으로 초기화."
            )  # 디버깅
        elif "sequences" not in logic3_patterns or not isinstance(
            logic3_patterns["sequences"], list
        ):
            logic3_patterns["sequences"] = [[1, 1, 1, 1, 1, 1, 1]]
            global_debug_log(
                "Logic3 patterns에 sequences가 없거나 형식이 잘못되어 기본 sequences로 초기화."
            )  # 디버깅

        sequences = logic3_patterns.get("sequences", [])
        pattern_count = logic3_patterns.get("pattern_count", len(sequences))

        context = {
            "title": "Logic-3 패턴 관리",
            "sequences": sequences,
            "pattern_count": pattern_count,
            "csrf_token": request.META.get("CSRF_COOKIE"),
            "messages": messages.get_messages(
                request
            ),  # Django messages 컨텍스트에 추가
            "DEBUG": settings.DEBUG,  # JS 디버깅을 위해 DEBUG 상태를 컨텍스트에 추가
        }
        global_debug_log(
            f"Logic3PatternManagementView: GET 요청 컨텍스트: {context}"
        )  # 디버깅
        return render(request, self.template_name, context)

    def post(self, request, *args, **kwargs):
        global_debug_log("\n--- Logic3PatternManagementView: POST 요청 수신 ---")
        global_debug_log(f"request.POST (원본): {dict(request.POST)}")
        try:
            sequences_data = []

            temp_sequences_map = {}
            for key in request.POST:
                if key.startswith("sequences["):
                    match = re.match(r"sequences\[(\d+)\]\[(\d+)\]", key)
                    if match:
                        row_idx = int(match.group(1))
                        col_idx = int(match.group(2))

                        if row_idx not in temp_sequences_map:
                            temp_sequences_map[row_idx] = [0] * 7

                        try:
                            temp_sequences_map[row_idx][col_idx] = int(
                                request.POST.get(key)
                            )
                        except ValueError:
                            global_debug_log(
                                f"--- Logic3PatternManagementView: 값 변환 오류 (정수가 아님): {key}={request.POST.get(key)} ---"
                            )
                            temp_sequences_map[row_idx][col_idx] = 1
                    else:
                        global_debug_log(
                            f"--- Logic3PatternManagementView: 정규식 불일치 키: {key} ---"
                        )

            sorted_row_indices = sorted(temp_sequences_map.keys())
            for idx in sorted_row_indices:
                sequences_data.append(temp_sequences_map[idx])

            pattern_count = len(sequences_data)  # 실제 파싱된 데이터 길이로 최종 결정

            global_debug_log(f"파싱된 sequences_data: {sequences_data}")
            global_debug_log(f"파싱된 pattern_count: {pattern_count}")

            config = BaccaraConfig.load()
            config.logic3_patterns = {
                "pattern_count": pattern_count,
                "sequences": sequences_data,
            }
            config.save()
            global_debug_log(
                f"BaccaraConfig.logic3_patterns 저장 완료: {config.logic3_patterns}"
            )

            messages.success(request, "Logic-3 패턴 설정이 성공적으로 저장되었습니다.")
            return redirect(reverse_lazy("admin:accounts_logic3_patterns_manage"))

        except Exception as e:
            global_debug_log(
                f"--- Logic3PatternManagementView: 저장 중 오류 발생: {e} ---"
            )
            messages.error(request, f"Logic-3 패턴 설정 저장 중 오류 발생: {e}")
            return redirect(reverse_lazy("admin:accounts_logic3_patterns_manage"))


@method_decorator(login_required(login_url=reverse_lazy("login")), name="dispatch")
@method_decorator(
    admin.site.admin_view, name="dispatch"
)  # Admin 권한 확인 및 컨텍스트 주입
class Logic2PatternManagementView(View):
    template_name = "admin/logic2_patterns_manage.html"

    def get(self, request, *args, **kwargs):
        global_debug_log(
            "\n--- Logic2PatternManagementView: GET 요청 수신 ---"
        )  # 디버깅
        config = BaccaraConfig.load()
        logic2_patterns = config.logic2_patterns

        global_debug_log(
            f"로드된 BaccaraConfig.logic2_patterns: {logic2_patterns}"
        )  # 디버깅

        if not logic2_patterns or not isinstance(logic2_patterns, list):
            logic2_patterns = [[1, 1, -1, -1, 1, 1, -1], [-1, -1, 1, 1, -1, -1, 1]]
            global_debug_log(
                "Logic2 patterns가 없거나 형식이 잘못되어 기본값으로 초기화."
            )  # 디버깅

        sequences = logic2_patterns
        pattern_count = len(sequences)

        context = {
            "title": "Logic-2 패턴 관리",
            "sequences": sequences,
            "pattern_count": pattern_count,
            "csrf_token": request.META.get("CSRF_COOKIE"),
            "messages": messages.get_messages(
                request
            ),  # Django messages 컨텍스트에 추가
            "DEBUG": settings.DEBUG,  # JS 디버깅을 위해 DEBUG 상태를 컨텍스트에 추가
        }
        global_debug_log(
            f"Logic2PatternManagementView: GET 요청 컨텍스트: {context}"
        )  # 디버깅
        return render(request, self.template_name, context)

    def post(self, request, *args, **kwargs):
        global_debug_log("\n--- Logic2PatternManagementView: POST 요청 수신 ---")
        global_debug_log(f"request.POST (원본): {dict(request.POST)}")
        try:
            sequences_data = []
            temp_sequences_map = {}
            for key in request.POST:
                if key.startswith("sequences["):
                    match = re.match(r"sequences\[(\d+)\]\[(\d+)\]", key)
                    if match:
                        row_idx = int(match.group(1))
                        col_idx = int(match.group(2))
                        value = int(request.POST.get(key))

                        if row_idx not in temp_sequences_map:
                            temp_sequences_map[row_idx] = [0] * 7

                        try:
                            temp_sequences_map[row_idx][col_idx] = int(
                                request.POST.get(key)
                            )
                        except ValueError:
                            global_debug_log(
                                f"--- Logic2PatternManagementView: 값 변환 오류 (정수가 아님): {key}={request.POST.get(key)} ---"
                            )
                            temp_sequences_map[row_idx][col_idx] = 1
                    else:
                        global_debug_log(
                            f"--- Logic2PatternManagementView: 정규식 불일치 키: {key} ---"
                        )

            sorted_row_indices = sorted(temp_sequences_map.keys())
            for idx in sorted_row_indices:
                sequences_data.append(temp_sequences_map[idx])

            config = BaccaraConfig.load()
            config.logic2_patterns = sequences_data
            config.save()
            global_debug_log(
                f"BaccaraConfig.logic2_patterns 저장 완료: {config.logic2_patterns}"
            )

            messages.success(request, "Logic-2 패턴 설정이 성공적으로 저장되었습니다.")
            return redirect(reverse_lazy("admin:accounts_logic2_patterns_manage"))

        except Exception as e:
            global_debug_log(
                f"--- Logic2PatternManagementView: 저장 중 오류 발생: {e} ---"
            )
            messages.error(request, f"Logic-2 패턴 설정 저장 중 오류 발생: {e}")
            return redirect(reverse_lazy("admin:accounts_logic2_patterns_manage"))
