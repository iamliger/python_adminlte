# baccara_analyse/api/game_logic.py

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.conf import settings

from accounts.models import CustomUser
from game_data.models import (
    BaccaraDB,
    ThreeTicket,
    FourTicket,
    FiveTicket,
    SixTicket,
    BaccaraConfig,
    ClsLog,
)

# 전역 디버그 로깅 함수를 임포트 (core_utils.py에 정의되어 있다고 가정)
from baccara_analyse.core_utils import global_debug_log


# ----------------------------------------------------
# PHP reverse() 함수 대응
# ----------------------------------------------------
def reverse_pos(value):
    global_debug_log(f"reverse_pos 호출됨: value={value}")
    if value == "P":
        return "B"
    if value == "B":
        return "P"
    return "T"


# ----------------------------------------------------
# PHP renderBetting() 함수 대응 (PHP에서는 그대로 반환)
# ----------------------------------------------------
def render_betting_pos(pos):
    global_debug_log(f"render_betting_pos 호출됨: pos={pos}")
    return pos


# ----------------------------------------------------
# PHP calculateNextState() 함수 대응
# ----------------------------------------------------
def calculate_next_state(current_state, last_pos, pattern_sequence, anchor_char):
    global_debug_log(
        f"calculate_next_state 호출됨: current_state={current_state}, last_pos={last_pos}, pattern_sequence={pattern_sequence}, anchor_char={anchor_char}"
    )

    step = current_state.get("step", 0)
    last_prediction = current_state.get("last_prediction", None)
    is_win = False

    if last_prediction is not None and last_pos != "T":
        if last_prediction == last_pos:
            step = 0
            is_win = True
        else:
            step += 1

    # 패턴 시퀀스의 길이를 초과하면 초기화
    if step >= len(pattern_sequence):
        step = 0

    rule = pattern_sequence[step]
    next_prediction = ""
    if rule == 1:
        next_prediction = anchor_char
    elif rule == -1:
        next_prediction = reverse_pos(anchor_char)

    global_debug_log(
        f"calculate_next_state 결과: step={step}, is_win={is_win}, next_prediction={next_prediction}"
    )
    return {"step": step, "is_win": is_win, "next_prediction": next_prediction}


# ----------------------------------------------------
# PHP updatePatternStatsInField() 함수 대응
# ----------------------------------------------------
def update_pattern_stats_in_field(user, pattern_type, result_type, is_undo=False):
    global_debug_log(
        f"update_pattern_stats_in_field 호출됨: user_id={user.id}, pattern_type={pattern_type}, result_type={result_type}, is_undo={is_undo}"
    )

    try:
        bacara_db, created = BaccaraDB.objects.get_or_create(user=user)
        stats = bacara_db.pattern_stats if bacara_db.pattern_stats else {}

        if pattern_type not in stats:
            stats[pattern_type] = {"wins": 0, "losses": 0, "pushes": 0}

        if is_undo:
            if result_type == "win":
                stats[pattern_type]["wins"] = max(0, stats[pattern_type]["wins"] - 1)
            elif result_type == "loss":
                stats[pattern_type]["losses"] = max(
                    0, stats[pattern_type]["losses"] - 1
                )
            # 'pushes'에 대한 PHP 로직이 없으므로 일단 무시
        else:
            if result_type == "win":
                stats[pattern_type]["wins"] += 1
            elif result_type == "loss":
                stats[pattern_type]["losses"] += 1
            # 'pushes'에 대한 PHP 로직이 없으므로 일단 무시

        bacara_db.pattern_stats = stats
        bacara_db.save(update_fields=["pattern_stats", "updated_at"])
        global_debug_log(
            f"update_pattern_stats_in_field 저장 완료: user_id={user.id}, stats={stats}"
        )
    except Exception as e:
        global_debug_log(
            f"update_pattern_stats_in_field 저장 중 오류 발생: user_id={user.id}, 오류={e}"
        )


# ----------------------------------------------------
# PHP updateWinresult() 함수 대응
# ----------------------------------------------------
def update_win_result(
    str_result_json,
    result_data,
    field_name,
    bet_pos,
    ticket_type_sidx,
    user,
    is_console=False,
):
    global_debug_log(
        f"update_win_result 호출됨: user_id={user.id}, ticket_type={ticket_type_sidx}, field_name={field_name}, bet_pos={bet_pos}, result_data={result_data}"
    )

    ticket_model = {
        3: ThreeTicket,
        4: FourTicket,
        5: FiveTicket,
        6: SixTicket,
    }.get(ticket_type_sidx)

    if not ticket_model:
        global_debug_log(
            f"update_win_result 오류: 알 수 없는 티켓 타입 sidx={ticket_type_sidx}"
        )
        return {"is_win": 0}

    try:
        ticket_instance, created = ticket_model.objects.get_or_create(user=user)

        # 필드에서 JSON 데이터 로드
        current_result = getattr(ticket_instance, field_name, {})
        if not isinstance(current_result, dict) or "win" not in current_result:
            current_result = {"win": 0, "lose": 0, "remwin": 0, "remlose": 0}

        win = current_result["win"]
        lose = current_result["lose"]
        remwin = current_result["remwin"]
        remlose = current_result["remlose"]
        is_win_status = 0  # 1:승, -1:패

        if result_data == bet_pos:
            win += 1
            remwin += 1
            lose = 0  # 승리 시 연속 패배 초기화
            is_win_status = 1
        else:
            lose += 1
            is_win_status = -1

        # PHP 로직의 lose === 9 처리
        if lose == 9:
            lose = 0
            remlose += 1

        updated_result = {
            "win": win,
            "lose": lose,
            "remwin": remwin,
            "remlose": remlose,
        }

        # 필드 업데이트 및 저장
        setattr(ticket_instance, field_name, updated_result)
        ticket_instance.save(update_fields=[field_name])  # specific field update

        global_debug_log(
            f"update_win_result 저장 완료: user_id={user.id}, {field_name}={updated_result}"
        )
        return {"is_win": is_win_status}

    except Exception as e:
        global_debug_log(
            f"update_win_result 처리 중 오류 발생: user_id={user.id}, 오류={e}"
        )
        return {"is_win": 0}
