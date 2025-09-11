# frontend/views.py

from django.shortcuts import render, redirect
from django.urls import reverse_lazy
from django.contrib.auth.decorators import login_required
import json


@login_required(login_url=reverse_lazy("login"))  # <-- 여기를 'login'으로 변경합니다
def baccara_analyzer_view(request):
    if request.user.level < 2:
        return redirect(reverse_lazy("accounts:approval_pending"))

    member_id = request.user.username
    member_level = request.user.level

    money_array_info = []
    is_show_money_info = False

    money_json = json.dumps(money_array_info)

    user_agent_string = request.META.get("HTTP_USER_AGENT", "").lower()
    is_mobile = False
    if (
        "android" in user_agent_string
        or "iphone" in user_agent_string
        or "ipad" in user_agent_string
        or "windows phone" in user_agent_string
    ):
        is_mobile = True
    device_mode = "Mobile" if is_mobile else "PC"

    history_box_rows = []
    for i in range(1, 5):
        history_box_rows.append(i + 2)

    context = {
        "member_id": member_id,
        "member_level": member_level,
        "is_show_money_info": is_show_money_info,
        "money_json": money_json,
        "device_mode": device_mode,
        "G5_BBS_URL": reverse_lazy("login"),  # <-- 여기를 'login'으로 변경합니다
        "G5_URL": reverse_lazy("root_redirect"),
        "history_box_rows": history_box_rows,
        "user": request.user,
    }
    return render(request, "frontend/baccara_analyzer.html", context)


@login_required(login_url=reverse_lazy("login"))  # <-- 여기를 'login'으로 변경합니다
def mypage_view(request):
    if request.user.level < 2:
        return redirect(reverse_lazy("accounts:approval_pending"))

    context = {
        "user_info": f"여기는 {request.user.username}님의 마이페이지 정보가 표시될 곳입니다. (이메일: {request.user.email}, 레벨: {request.user.level})",
        "game_stats": "여기는 사용자 게임 통계가 표시될 곳입니다.",
        "member_id": request.user.username,
        "member_level": request.user.level,
        "user": request.user,
    }
    return render(request, "frontend/mypage_content.html", context)
