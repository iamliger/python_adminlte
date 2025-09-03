# frontend/views.py

from django.shortcuts import render
import json


def baccara_analyzer_view(request):
    member_id = request.user.username if request.user.is_authenticated else "guest"
    member_level = (
        10 if request.user.is_superuser else (1 if request.user.is_authenticated else 0)
    )

    money_array_info = []
    is_show_money_info = False  # 초기에는 모달이 자동으로 열리지 않도록 False로 설정

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
    print(
        f"DEBUG: device_mode from view = '{device_mode}'"
    )  # <--- 디버깅용 print, 따옴표 추가

    history_box_rows = []
    for i in range(1, 5):
        history_box_rows.append(i + 2)

    context = {
        "member_id": member_id,
        "member_level": member_level,
        "is_show_money_info": is_show_money_info,
        "money_json": money_json,
        "device_mode": device_mode,  # <--- 이 값이 템플릿으로 정확히 전달됩니다.
        "G5_BBS_URL": "/accounts",
        "G5_URL": "/",
        "history_box_rows": history_box_rows,
    }
    return render(request, "frontend/baccara_analyzer.html", context)
