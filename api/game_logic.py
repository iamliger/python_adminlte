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

from baccara_analyse.core_utils import global_debug_log
import re


def reverse_pos(value):
    global_debug_log(f"reverse_pos 호출됨: value={value}")
    if value == "P":
        return "B"
    if value == "B":
        return "P"
    return "T"


def render_betting_pos(pos):
    global_debug_log(f"render_betting_pos 호출됨: pos={pos}")
    return pos


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
        else:
            if result_type == "win":
                stats[pattern_type]["wins"] += 1
            elif result_type == "loss":
                stats[pattern_type]["losses"] += 1

        bacara_db.pattern_stats = stats
        bacara_db.save(update_fields=["pattern_stats", "updated_at"])
        global_debug_log(
            f"update_pattern_stats_in_field 저장 완료: user_id={user.id}, stats={stats}"
        )
    except Exception as e:
        global_debug_log(
            f"update_pattern_stats_in_field 저장 중 오류 발생: user_id={user.id}, 오류={e}"
        )


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
        # CustomUser의 username과 Ticket 모델의 memberid를 매칭하여 인스턴스 가져오기
        ticket_instance, created = ticket_model.objects.get_or_create(
            user=user, defaults={"memberid": user.username}
        )
        # 만약 이미 memberid가 있지만 user가 연결되지 않은 경우를 대비 (단, OneToOneField 덕분에 user는 항상 연결됨)
        if ticket_instance.memberid != user.username:
            ticket_instance.memberid = user.username
            ticket_instance.save(update_fields=["memberid"])

        current_result = getattr(ticket_instance, field_name, {})
        if not isinstance(current_result, dict) or "win" not in current_result:
            current_result = {"win": 0, "lose": 0, "remwin": 0, "remlose": 0}

        win = current_result["win"]
        lose = current_result["lose"]
        remwin = current_result["remwin"]
        remlose = current_result["remlose"]
        is_win_status = 0

        if result_data == bet_pos:
            win += 1
            remwin += 1
            lose = 0
            is_win_status = 1
        else:
            lose += 1
            is_win_status = -1

        if lose == 9:
            lose = 0
            remlose += 1

        updated_result = {
            "win": win,
            "lose": lose,
            "remwin": remwin,
            "remlose": remlose,
        }

        setattr(ticket_instance, field_name, updated_result)
        ticket_instance.save(update_fields=[field_name])

        global_debug_log(
            f"update_win_result 저장 완료: user_id={user.id}, {field_name}={updated_result}"
        )
        return {"is_win": is_win_status}

    except Exception as e:
        global_debug_log(
            f"update_win_result 처리 중 오류 발생: user_id={user.id}, 오류={e}"
        )
        return {"is_win": 0}


def process_logic1(user, bcdata, should_update_stats=True):
    global_debug_log(
        f"process_logic1 호출됨: user_id={user.id}, bcdata={bcdata}, should_update_stats={should_update_stats}"
    )

    member_id = user.username
    slen = len(bcdata)

    try:
        bacara_db, created = BaccaraDB.objects.get_or_create(
            user=user, defaults={"memberid": user.username}
        )
        if bacara_db.memberid != user.username:
            bacara_db.memberid = user.username
            bacara_db.save(update_fields=["memberid"])

        patterns_db_fields = {
            3: bacara_db.Pattern_3,
            4: bacara_db.Pattern_4,
            5: bacara_db.Pattern_5,
            6: bacara_db.Pattern_6,
        }
    except Exception as e:
        global_debug_log(f"BaccaraDB 로드 오류: user_id={user.id}, 오류={e}")
        return []

    patterndb_result = []
    logic1_overall_hit = 0
    logic1_overall_miss = 0

    if (
        slen >= 1
    ):  # PHP 코드에 명시적인 slen >= 6 조건이 없었음. (원래 PHP에서는 loop 조건에서 걸러짐)
        # 단, pattern 감지는 slen >= 6 이후에나 의미 있으므로 이 조건은 유지

        for sidx in range(3, 7):  # 3매, 4매, 5매, 6매
            patterndb = []
            for _ in range(4):
                patterndb.append(
                    {
                        "bettingtype": "none",
                        "bettringround": 0,
                        "bettingpos": "",
                        "isshow": False,
                        "lose": 0,
                        "measu": 0,
                        "icon": "",
                    }
                )

            current_pattern_json = patterns_db_fields.get(sidx, [])
            if current_pattern_json and isinstance(current_pattern_json, list):
                for i in range(min(len(current_pattern_json), len(patterndb))):
                    patterndb[i] = current_pattern_json[i]

            # PHP 코드에서는 $slen (현재 길이) 라운드에 대한 베팅 결과를 업데이트합니다.
            # 이 업데이트는 '현재' 들어온 족보를 반영한 후, '이전' 베팅에 대한 승패를 결정합니다.
            for i in range(4):
                if (
                    patterndb[i]["bettingtype"] != "none"
                    and patterndb[i]["bettringround"] == slen
                ):  # 베팅 라운드가 현재 족보 길이와 같을 때
                    ticket_instance, _ = (
                        {3: ThreeTicket, 4: FourTicket, 5: FiveTicket, 6: SixTicket}
                        .get(sidx)
                        .objects.get_or_create(
                            user=user, defaults={"memberid": user.username}
                        )
                    )
                    if ticket_instance.memberid != user.username:
                        ticket_instance.memberid = user.username
                        ticket_instance.save(update_fields=["memberid"])

                    field_name = patterndb[i]["bettingtype"]
                    current_ticket_field_data = getattr(ticket_instance, field_name, {})

                    update_result_data = update_win_result(
                        current_ticket_field_data,
                        bcdata[slen - 1],  # 마지막으로 들어온 카드 결과
                        field_name,
                        patterndb[i][
                            "bettingpos"
                        ],  # 이전 라운드에 대한 예측 베팅 포지션
                        sidx,
                        user,
                    )

                    was_win = update_result_data["is_win"] == 1

                    if should_update_stats:
                        update_pattern_stats_in_field(
                            user,
                            patterndb[i]["bettingtype"],
                            "win" if was_win else "loss",
                        )
                        if was_win:
                            logic1_overall_hit += 1
                        else:
                            logic1_overall_miss += 1

                    if was_win:
                        # 승리 시 패턴 슬롯 초기화
                        patterndb[i] = {
                            "bettingtype": "none",
                            "bettringround": 0,
                            "bettingpos": "",
                            "isshow": False,
                            "lose": 0,
                            "measu": 0,
                            "icon": "",
                        }
                    else:
                        # 패배 시 lose 카운트 업데이트 (update_win_result에서 반환된 최신 lose 값 사용)
                        updated_ticket_instance = (
                            {  # DB에서 최신 데이터 다시 로드
                                3: ThreeTicket,
                                4: FourTicket,
                                5: FiveTicket,
                                6: SixTicket,
                            }
                            .get(sidx)
                            .objects.get(user=user)
                        )
                        updated_field_data = getattr(
                            updated_ticket_instance, field_name, {}
                        )
                        patterndb[i]["lose"] = updated_field_data.get("lose", 0)
                        patterndb[i]["bettringround"] = (
                            slen + 1
                        )  # 다음 라운드를 위한 베팅 라운드 업데이트

            # ----------------------------------------------------
            # 새로운 패턴 찾기 및 업데이트 (PHP 로직에 대한 세부 재점검)
            # ----------------------------------------------------
            last_pos = bcdata[slen - 1]  # 현재 들어온 마지막 카드

            # PHP의 $remain3 (Python에서는 'remain') 변수 사용
            remain = slen % sidx

            # _pattern (메인 로드맵과 동일 패턴) - PHP 조건 ($remain3 === 0 && $slen >= ($sidx*2) && $sidx === 3)
            # PHP 코드: $pos === $bcdata[($slen-1) - $sidx]
            if sidx == 3 and remain == 0 and slen >= (sidx * 2):  # 3매 전용
                if slen - 1 - sidx >= 0 and last_pos == bcdata[slen - 1 - sidx]:
                    # _pattern 슬롯 (index 0) 업데이트
                    patterndb[0] = {
                        "bettingtype": "_pattern",
                        "bettingpos": render_betting_pos(last_pos),
                        "isshow": False,
                        "measu": sidx,
                        "bettringround": slen + 1,
                        "lose": 0,
                        "icon": "",
                    }

            # tpattern (타이 패턴) - PHP 조건 (($remain3 >= 1 || $remain3 === 0) && $slen >= ($sidx*2+$remain3))
            # PHP 코드: $arrT = [$slen-($sidx*2)-1, $slen-$sidx-1, $slen-$sidx, $slen-1];
            #           $nRightCount === count($arrT) && isset($bcdata[$mustPos]) && $pos !== $bcdata[$mustPos]
            if (remain >= 1 or remain == 0) and slen >= (sidx * 2 + remain):
                must_pos_t_idx = slen - (sidx * 2)  # $mustPos_t는 PHP의 $slen-($sidx*2)

                # PHP $arrT에 해당하는 인덱스들
                arr_t_checker_indices = [
                    slen - (sidx * 2) - 1,  # 첫 번째 비교 지점
                    slen - sidx - 1,  # 두 번째 비교 지점
                    slen - sidx,  # 세 번째 비교 지점
                    slen - 1,  # 마지막 지점 (last_pos)
                ]

                is_tpattern_match = True
                for idx in arr_t_checker_indices:
                    # 인덱스가 유효하고 해당 위치의 문자가 last_pos와 일치해야 합니다.
                    if not (0 <= idx < slen and bcdata[idx] == last_pos):
                        is_tpattern_match = False
                        break

                # 최종 조건: arr_t_checker_indices의 모든 값이 last_pos와 같고,
                # must_pos_t_idx의 값이 last_pos와 달라야 합니다.
                if (
                    is_tpattern_match
                    and 0 <= must_pos_t_idx < slen
                    and last_pos != bcdata[must_pos_t_idx]
                ):
                    # tpattern 슬롯 (index 1) 업데이트
                    patterndb[1] = {
                        "bettingtype": "tpattern",
                        "bettingpos": render_betting_pos(reverse_pos(last_pos)),
                        "isshow": False,
                        "measu": sidx,
                        "bettringround": slen + 1,
                        "lose": 0,
                        "icon": "",
                    }

            # upattern (꺾어지는 패턴) - PHP 조건 (($remain3 >= 2 || $remain3 === 0) && $slen >= ($sidx*2+$remain3))
            # PHP 코드: $arrline = [$slen-($sidx*2)-2, $slen-($sidx*2)-1, $slen-$sidx-1, $slen-2, $slen-1];
            #           $nRightCount === count($arrline) && isset($bcdata[$mustPos]) && $pos !== $bcdata[$mustPos]
            if (remain >= 2 or remain == 0) and slen >= (sidx * 2 + remain):
                must_pos_u_idx = slen - sidx - 2  # $mustPos_u는 PHP의 $slen-$sidx-2

                # PHP $arrline에 해당하는 인덱스들
                arr_u_checker_indices = [
                    slen - (sidx * 2) - 2,
                    slen - (sidx * 2) - 1,
                    slen - sidx - 1,
                    slen - 2,
                    slen - 1,
                ]

                is_upattern_match = True
                for idx in arr_u_checker_indices:
                    if not (0 <= idx < slen and bcdata[idx] == last_pos):
                        is_upattern_match = False
                        break

                if (
                    is_upattern_match
                    and 0 <= must_pos_u_idx < slen
                    and last_pos != bcdata[must_pos_u_idx]
                ):
                    # upattern 슬롯 (index 2) 업데이트
                    patterndb[2] = {
                        "bettingtype": "upattern",
                        "bettingpos": render_betting_pos(reverse_pos(last_pos)),
                        "isshow": False,
                        "measu": sidx,
                        "bettringround": slen + 1,
                        "lose": 0,
                        "icon": "",
                    }

            # npattern (역으로 꺾어지는 패턴) - PHP 조건 (($remain3 >= 2 || $remain3 === 0) && $slen >= ($sidx*2+$remain3)) (upattern과 동일 조건)
            # PHP 코드: $arrline = [$slen-($sidx*2)-2, $slen-($sidx*2)-1, $slen-$sidx-2, $slen-2, $slen-1];
            #           $nRightCount === count($arrline) && isset($bcdata[$mustPos]) && $pos !== $bcdata[$mustPos]
            if (remain >= 2 or remain == 0) and slen >= (sidx * 2 + remain):
                must_pos_n_idx = slen - sidx - 1  # $mustPos_n은 PHP의 $slen-$sidx-1

                # PHP $arrline에 해당하는 인덱스들 (upattern과 다름)
                arr_n_checker_indices = [
                    slen - (sidx * 2) - 2,
                    slen - (sidx * 2) - 1,
                    slen - sidx - 2,
                    slen - 2,
                    slen - 1,
                ]

                is_npattern_match = True
                for idx in arr_n_checker_indices:
                    if not (0 <= idx < slen and bcdata[idx] == last_pos):
                        is_npattern_match = False
                        break

                if (
                    is_npattern_match
                    and 0 <= must_pos_n_idx < slen
                    and last_pos != bcdata[must_pos_n_idx]
                ):
                    # npattern 슬롯 (index 3) 업데이트
                    patterndb[3] = {
                        "bettingtype": "npattern",
                        "bettingpos": render_betting_pos(reverse_pos(last_pos)),
                        "isshow": False,
                        "measu": sidx,
                        "bettringround": slen + 1,
                        "lose": 0,
                        "icon": "",
                    }

            # DB에 patterndb 업데이트
            if any(p["bettingtype"] != "none" for p in patterndb):
                # getattr()와 setattr()을 사용하여 동적으로 필드에 접근합니다.
                setattr(bacara_db, f"Pattern_{sidx}", patterndb)
                bacara_db.save(update_fields=[f"Pattern_{sidx}", "updated_at"])
                global_debug_log(
                    f"BaccaraDB.Pattern_{sidx} 업데이트 완료: user_id={user.id}"
                )

            # isshow 플래그 업데이트
            for i in range(4):
                if (
                    patterndb[i]["bettingtype"] != "none"
                    and (patterndb[i]["bettringround"] - 1 == slen)
                    and not patterndb[i]["isshow"]
                    and patterndb[i]["lose"] >= 0
                ):
                    patterndb[i]["isshow"] = True

            patterndb_result.append(patterndb)

        if (logic1_overall_hit > 0 or logic1_overall_miss > 0) and should_update_stats:
            update_pattern_stats_in_field(
                user, "overall_logic1", "win" if logic1_overall_hit > 0 else "loss"
            )

    return patterndb_result


def process_logic2(
    user, bcdata_with_t, all_logic_states_before=None, should_update_stats=True
):
    global_debug_log(
        f"process_logic2 호출됨: user_id={user.id}, bcdata_with_t={bcdata_with_t}, should_update_stats={should_update_stats}"
    )

    pb_indices = [i for i, char in enumerate(bcdata_with_t) if char != "T"]
    if not pb_indices:
        return {"next_states": {}, "predictions": [], "is_win": 0}

    last_pos = bcdata_with_t[pb_indices[-1]]
    if last_pos == "T":
        return {
            "next_states": (
                all_logic_states_before.get("logic2", {})
                if all_logic_states_before
                else {}
            ),
            "predictions": [],
            "is_win": 0,
        }

    try:
        baccara_config = BaccaraConfig.load()
        logic2_config_sequences = (
            baccara_config.logic2_patterns if baccara_config.logic2_patterns else []
        )
        if not isinstance(logic2_config_sequences, list) or not logic2_config_sequences:
            logic2_config_sequences = [
                [1, 1, -1, -1, 1, 1, -1],
                [-1, -1, 1, 1, -1, -1, 1],
            ]
    except Exception as e:
        global_debug_log(
            f"BaccaraConfig.logic2_patterns 로드 오류: {e}. 기본 패턴 사용."
        )
        logic2_config_sequences = [[1, 1, -1, -1, 1, 1, -1], [-1, -1, 1, 1, -1, -1, 1]]

    patterns_info = {}
    for i, seq in enumerate(logic2_config_sequences):
        name = "패턴 " + chr(ord("A") + i)
        if i == 0:
            name = "붙붙꺽 패턴"
        if i == 1:
            name = "꺽꺽붙 패턴"
        patterns_info[chr(ord("A") + i)] = {"name": name, "sequence": seq}

    if all_logic_states_before is None:
        try:
            bacara_db, _ = BaccaraDB.objects.get_or_create(
                user=user, defaults={"memberid": user.username}
            )  # defaults에 memberid 추가
            if bacara_db.memberid != user.username:
                bacara_db.memberid = user.username
                bacara_db.save(update_fields=["memberid"])
            all_logic_states_before = (
                bacara_db.logic_state if bacara_db.logic_state else {}
            )
        except Exception as e:
            global_debug_log(
                f"BaccaraDB logic_state 로드 오류: user_id={user.id}, 오류={e}"
            )
            all_logic_states_before = {}

    logic2_states = all_logic_states_before.get("logic2", {})

    is_win_ref = 0

    any_hit = False
    any_pred_exist = False
    for key in patterns_info:
        last_prediction = logic2_states.get(key, {}).get("last_prediction")
        if last_prediction:
            any_pred_exist = True
            if last_prediction == last_pos:
                any_hit = True
                break

    if any_pred_exist:
        is_win_ref = 1 if any_hit else -1
        if should_update_stats:
            update_pattern_stats_in_field(
                user, "overall_logic2", "win" if any_hit else "loss"
            )

    next_states = {}
    predictions = []

    anchor_char = last_pos

    for key, pattern_info in patterns_info.items():
        current_state = logic2_states.get(key, {"step": 0, "last_prediction": None})
        updated_info = calculate_next_state(
            current_state, last_pos, pattern_info["sequence"], anchor_char
        )

        next_states[key] = {
            "step": updated_info["step"],
            "last_prediction": updated_info["next_prediction"],
        }
        predictions.append(
            {
                "patternKey": f"logic2_{key}",
                "bettingpos": updated_info["next_prediction"],
                "isshow": True,
                "measu": updated_info["step"] + 1,
                "display_name": pattern_info["name"],
            }
        )

    global_debug_log(
        f"process_logic2 결과: next_states={next_states}, predictions={predictions}, is_win_ref={is_win_ref}"
    )
    return {
        "next_states": next_states,
        "predictions": predictions,
        "is_win": is_win_ref,
    }


def process_logic3(
    user, bcdata_with_t, all_logic_states_before=None, should_update_stats=True
):
    global_debug_log(
        f"process_logic3 호출됨: user_id={user.id}, bcdata_with_t={bcdata_with_t}, should_update_stats={should_update_stats}"
    )

    try:
        baccara_config = BaccaraConfig.load()
        logic3_config = (
            baccara_config.logic3_patterns if baccara_config.logic3_patterns else {}
        )
        if not isinstance(logic3_config, dict):
            raise ValueError(
                "BaccaraConfig.logic3_patterns가 딕셔너리 형식이 아닙니다."
            )
    except Exception as e:
        global_debug_log(
            f"BaccaraConfig.logic3_patterns 로드 오류 또는 형식 오류: {e}. 기본값 사용."
        )
        logic3_config = {"pattern_count": 1, "sequences": [[1, 1, 1, 1, 1, 1, 1]]}

    sequences = logic3_config.get("sequences", [])
    pattern_count = len(sequences)

    if not sequences:
        return {"next_states": {}, "predictions": [], "is_win": 0}

    pb_indices = [i for i, char in enumerate(bcdata_with_t) if char != "T"]
    if not pb_indices:
        return {"next_states": {}, "predictions": [], "is_win": 0}

    last_pos = bcdata_with_t[pb_indices[-1]]
    if last_pos == "T":
        return {
            "next_states": (
                all_logic_states_before.get("logic3", {})
                if all_logic_states_before
                else {}
            ),
            "predictions": [],
            "is_win": 0,
        }

    if all_logic_states_before is None:
        try:
            bacara_db, _ = BaccaraDB.objects.get_or_create(
                user=user, defaults={"memberid": user.username}
            )  # defaults에 memberid 추가
            if bacara_db.memberid != user.username:
                bacara_db.memberid = user.username
                bacara_db.save(update_fields=["memberid"])
            all_logic_states_before = (
                bacara_db.logic_state if bacara_db.logic_state else {}
            )
        except Exception as e:
            global_debug_log(
                f"BaccaraDB logic_state 로드 오류: user_id={user.id}, 오류={e}"
            )
            all_logic_states_before = {}

    logic3_states = all_logic_states_before.get("logic3", {})

    is_win_ref = 0

    last_final_prediction = logic3_states.get("final_prediction")
    if last_final_prediction:
        hit = last_final_prediction == last_pos
        is_win_ref = 1 if hit else -1
        if should_update_stats:
            update_pattern_stats_in_field(
                user, "overall_logic3", "win" if hit else "loss"
            )

    anchor_char = last_pos
    next_individual_states = {}
    all_next_predictions = []

    for i, sequence in enumerate(sequences):
        pattern_key = f"pattern_{i}"
        current_state = logic3_states.get(
            pattern_key, {"step": 0, "last_prediction": None}
        )
        updated_info = calculate_next_state(
            current_state, last_pos, sequence, anchor_char
        )
        next_individual_states[pattern_key] = {
            "step": updated_info["step"],
            "last_prediction": updated_info["next_prediction"],
        }
        all_next_predictions.append(updated_info["next_prediction"])

    if not all_next_predictions:
        return {
            "next_states": next_individual_states,
            "predictions": [],
            "is_win": is_win_ref,
        }

    from collections import Counter

    counts = Counter(filter(None, all_next_predictions))

    next_final_prediction = None
    if counts:
        next_final_prediction = max(counts, key=counts.get)

    next_states = next_individual_states
    next_states["final_prediction"] = next_final_prediction

    predictions = []
    if next_final_prediction:
        prediction_percentage = (counts[next_final_prediction] / pattern_count) * 100
        predictions.append(
            {
                "patternKey": "logic3_final",
                "bettingpos": next_final_prediction,
                "isshow": True,
                "display_name": f"종합 예측 ({counts[next_final_prediction]}/{pattern_count}, {prediction_percentage:.0f}%)",
            }
        )

    global_debug_log(
        f"process_logic3 결과: next_states={next_states}, predictions={predictions}, is_win_ref={is_win_ref}"
    )
    return {
        "next_states": next_states,
        "predictions": predictions,
        "is_win": is_win_ref,
    }


def process_logic4(
    user, bcdata_with_t, all_logic_states_before=None, should_update_stats=True
):
    global_debug_log(
        f"process_logic4 호출됨: user_id={user.id}, bcdata_with_t={bcdata_with_t}, should_update_stats={should_update_stats}"
    )

    pb_string = "".join([char for char in bcdata_with_t if char != "T"])
    pb_len = len(pb_string)

    if pb_len < 1:
        return {"next_states": {}, "predictions": [], "is_win": 0}

    last_pos = pb_string[-1]

    if all_logic_states_before is None:
        try:
            bacara_db, _ = BaccaraDB.objects.get_or_create(
                user=user, defaults={"memberid": user.username}
            )  # defaults에 memberid 추가
            if bacara_db.memberid != user.username:
                bacara_db.memberid = user.username
                bacara_db.save(update_fields=["memberid"])
            all_logic_states_before = (
                bacara_db.logic_state if bacara_db.logic_state else {}
            )
        except Exception as e:
            global_debug_log(
                f"BaccaraDB logic_state 로드 오류: user_id={user.id}, 오류={e}"
            )
            all_logic_states_before = {}

    logic4_state = all_logic_states_before.get("logic4", {})

    is_win_ref = 0

    last_pred_3mae = logic4_state.get("pred_3mae")
    last_pred_4mae = logic4_state.get("pred_4mae")
    last_pred_5mae = logic4_state.get("pred_5mae")

    any_logic4_pred_exist = any(
        p for p in [last_pred_3mae, last_pred_4mae, last_pred_5mae] if p
    )
    any_logic4_hit = any(
        p == last_pos for p in [last_pred_3mae, last_pred_4mae, last_pred_5mae] if p
    )

    if any_logic4_pred_exist:
        is_win_ref = 1 if any_logic4_hit else -1
        if should_update_stats:
            update_pattern_stats_in_field(
                user, "overall_logic4", "win" if any_logic4_hit else "loss"
            )

    predictions = []
    next_states = {}

    pred_3mae = None
    if pb_len >= 2:
        pred_3mae = "B" if pb_string[pb_len - 1] == pb_string[pb_len - 2] else "P"
    predictions.append(
        {
            "patternKey": "logic4_3mae",
            "bettingpos": pred_3mae,
            "isshow": True,
            "display_name": "3매",
            "measu": 3,
        }
    )
    next_states["pred_3mae"] = pred_3mae

    pred_4mae = None
    if pb_len >= 3:
        pred_4mae = "B" if pb_string[pb_len - 1] == pb_string[pb_len - 3] else "P"
    predictions.append(
        {
            "patternKey": "logic4_4mae",
            "bettingpos": pred_4mae,
            "isshow": True,
            "display_name": "4매",
            "measu": 4,
        }
    )
    next_states["pred_4mae"] = pred_4mae

    pred_5mae = None
    if pb_len >= 4:
        pred_5mae = "B" if pb_string[pb_len - 1] == pb_string[pb_len - 4] else "P"
    predictions.append(
        {
            "patternKey": "logic4_5mae",
            "bettingpos": pred_5mae,
            "isshow": True,
            "display_name": "5매",
            "measu": 5,
        }
    )
    next_states["pred_5mae"] = pred_5mae

    global_debug_log(
        f"process_logic4 결과: next_states={next_states}, predictions={predictions}, is_win_ref={is_win_ref}"
    )
    return {
        "next_states": next_states,
        "predictions": predictions,
        "is_win": is_win_ref,
    }


def process_ai_logic(user, bcdata, current_logic_states=None, baccara_config=None):
    global_debug_log(f"process_ai_logic 호출됨: user_id={user.id}, bcdata={bcdata}")

    ai_prediction = None
    if len(bcdata) > 5:
        last_char = bcdata[-1]
        predicted_pos = reverse_pos(last_char)
        ai_prediction = {
            "bettingpos": predicted_pos,
            "display_name": "AI",
            "confidence": 0.85,
        }
    else:
        ai_prediction = {"bettingpos": "P", "display_name": "AI", "confidence": 0.50}

    global_debug_log(f"process_ai_logic 결과: ai_prediction={ai_prediction}")
    return ai_prediction


def run_all_virtual_analytics(user, bcdata):
    global_debug_log(
        f"run_all_virtual_analytics 호출됨: user_id={user.id}, bcdata={bcdata}"
    )

    bacara_db, _ = BaccaraDB.objects.get_or_create(
        user=user, defaults={"memberid": user.username}
    )  # defaults에 memberid 추가
    if bacara_db.memberid != user.username:
        bacara_db.memberid = user.username
        bacara_db.save(update_fields=["memberid"])

    all_logic_states_before = bacara_db.logic_state if bacara_db.logic_state else {}

    _ = process_logic1(user, bcdata, should_update_stats=True)

    logic2_result_for_stats = process_logic2(
        user, bcdata, all_logic_states_before, should_update_stats=True
    )
    logic3_result_for_stats = process_logic3(
        user, bcdata, all_logic_states_before, should_update_stats=True
    )
    logic4_result_for_stats = process_logic4(
        user, bcdata, all_logic_states_before, should_update_stats=True
    )

    all_new_states = {}
    all_new_states["logic2"] = process_logic2(
        user, bcdata, all_logic_states_before, should_update_stats=False
    )["next_states"]
    all_new_states["logic3"] = process_logic3(
        user, bcdata, all_logic_states_before, should_update_stats=False
    )["next_states"]
    all_new_states["logic4"] = process_logic4(
        user, bcdata, all_logic_states_before, should_update_stats=False
    )["next_states"]

    bacara_db.logic_state = all_new_states
    bacara_db.save(update_fields=["logic_state", "updated_at"])
    global_debug_log(
        f"run_all_virtual_analytics: logic_state 업데이트 완료: {all_new_states}"
    )


def build_current_state_response(user, bcdata, selected_logic):
    global_debug_log(
        f"build_current_state_response 호출됨: user_id={user.id}, bcdata={bcdata}, selected_logic={selected_logic}"
    )

    bacara_db, created = BaccaraDB.objects.get_or_create(
        user=user, defaults={"memberid": user.username}
    )  # defaults에 memberid 추가
    if bacara_db.memberid != user.username:
        bacara_db.memberid = user.username
        bacara_db.save(update_fields=["memberid"])

    all_logic_states = bacara_db.logic_state if bacara_db.logic_state else {}
    full_logic_state = {}

    full_logic_state["current_bcdata"] = bcdata

    for sidx in range(3, 7):
        # 모델 필드명에 맞춰서 접근합니다.
        pattern_json = getattr(bacara_db, f"Pattern_{sidx}", [])
        if pattern_json and isinstance(pattern_json, list):
            for p in pattern_json:
                if p.get("bettingtype") != "none":
                    full_logic_state[p["bettingtype"]] = p.get("lose", 0) + 1

    if "logic2" in all_logic_states:
        for key in ["A", "B"]:
            if (
                key in all_logic_states["logic2"]
                and "step" in all_logic_states["logic2"][key]
            ):
                full_logic_state[f"logic2_{key}"] = (
                    all_logic_states["logic2"][key]["step"] + 1
                )

    if "logic3" in all_logic_states:
        for key, state in all_logic_states["logic3"].items():
            if isinstance(state, dict) and key != "final_prediction":
                match = re.match(r"pattern_(\d+)", key)
                if match:
                    idx = match.group(1)
                    full_logic_state[f"logic3_{idx}"] = state.get("step", 0) + 1

    if "logic4" in all_logic_states:
        if "pred_3mae" in all_logic_states["logic4"]:
            full_logic_state["logic4_3mae"] = 1
        if "pred_4mae" in all_logic_states["logic4"]:
            full_logic_state["logic4_4mae"] = 1
        if "pred_5mae" in all_logic_states["logic4"]:
            full_logic_state["logic4_5mae"] = 1

    predictions_to_show = []

    slen = len(bcdata)
    if selected_logic == "logic1":
        for sidx in range(3, 7):
            pattern_json = getattr(bacara_db, f"Pattern_{sidx}", [])
            if pattern_json and isinstance(pattern_json, list):
                for p in pattern_json:
                    if p.get("bettingtype") != "none" and p.get("bettingpos"):
                        predictions_to_show.append(
                            {
                                "patternKey": p["bettingtype"],
                                "bettingpos": p["bettingpos"],
                                "display_name": p["bettingtype"],
                                "measu": sidx,
                            }
                        )
    elif selected_logic == "logic2":
        logic2_states = all_logic_states.get("logic2", {})
        for key in ["A", "B"]:
            last_pred = logic2_states.get(key, {}).get("last_prediction")
            if last_pred:
                display_name = "붙붙꺽 패턴" if key == "A" else "꺽꺽붙 패턴"
                predictions_to_show.append(
                    {
                        "patternKey": f"logic2_{key}",
                        "bettingpos": last_pred,
                        "display_name": display_name,
                        "measu": logic2_states.get(key, {}).get("step", 0) + 1,
                    }
                )
    elif selected_logic == "logic3":
        logic3_states = all_logic_states.get("logic3", {})
        last_final_prediction = logic3_states.get("final_prediction")
        if last_final_prediction:
            predictions_to_show.append(
                {
                    "patternKey": "logic3_final",
                    "bettingpos": last_final_prediction,
                    "display_name": "종합 예측",
                    "measu": logic3_states.get("final_prediction_step", 0) + 1,
                }
            )
    elif selected_logic == "logic4":
        logic4_states = all_logic_states.get("logic4", {})
        for key in ["pred_3mae", "pred_4mae", "pred_5mae"]:
            last_pred = logic4_states.get(key)
            if last_pred:
                display_name = {
                    "pred_3mae": "3매",
                    "pred_4mae": "4매",
                    "pred_5mae": "5매",
                }.get(key)
                predictions_to_show.append(
                    {
                        "patternKey": f"logic4_{key.replace('pred_', '')}",
                        "bettingpos": last_pred,
                        "display_name": display_name,
                        "measu": int(key.replace("pred_", "").replace("mae", "")),
                    }
                )

    predictions_to_show = [p for p in predictions_to_show if p.get("bettingpos")]

    global_debug_log(
        f"build_current_state_response 결과: predictions_to_show={predictions_to_show}, full_logic_state={full_logic_state}"
    )
    return {
        "predictions_to_show": predictions_to_show,
        "full_logic_state": full_logic_state,
    }
