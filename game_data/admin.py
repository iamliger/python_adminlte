# game_data/admin.py

from django.contrib import admin
from django.forms import widgets  # widgets 임포트는 필요 없으므로 제거
from django.core.exceptions import (
    ValidationError,
)  # BaccaraConfig save() 메서드에서 사용 (models.py에서 이미 정의되어 있으므로 제거)
from .models import (
    BroadcastMessage,
    BaccaraConfig,
    BaccaraDB,
    ThreeTicket,
    FourTicket,
    FiveTicket,
    SixTicket,
    ClsLog,
)

# django_json_widget의 위젯을 임포트합니다.
from django_json_widget.widgets import JSONEditorWidget


# ----------------------------------------------------
# 1. BaccaraDBAdmin (바카라 게임 데이터) 등록
# ----------------------------------------------------
@admin.register(BaccaraDB)
class BaccaraDBAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "dayinfo",
        "bcdata_preview",
        "logic_state_preview",
        "pattern_stats_preview",
        "updated_at",
    )
    list_filter = ("dayinfo", "updated_at")
    search_fields = ("user__username", "bcdata")
    readonly_fields = ("created_at", "updated_at")

    # JSONField를 JSONEditorWidget으로 표시
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # JSONField에 JSONEditorWidget 적용
        json_fields = [
            "pattern_3",
            "pattern_4",
            "pattern_5",
            "pattern_6",
            "ptn",
            "ptnhistory",
            "baseresult",
            "coininfo",
            "chartResult",
            "pattern_stats",
            "logic_state",
            "logic3_patterns",
            "analytics_data",
            "virtual_stats",
            "game_history",
            "logic2_state",
        ]
        for field in json_fields:
            if field in form.base_fields:
                form.base_fields[field].widget = JSONEditorWidget(
                    width="100%",
                    height="200px",
                    options={
                        "mode": "code",
                        "modes": ["code", "tree"],
                        "navigationBar": True,
                    },
                )
        return form

    # bcdata 내용 미리보기
    def bcdata_preview(self, obj):
        return obj.bcdata[:50] + "..." if len(obj.bcdata) > 50 else obj.bcdata

    bcdata_preview.short_description = "바카라 데이터"

    # logic_state 미리보기
    def logic_state_preview(self, obj):
        return str(obj.logic_state)[:50] + "..." if obj.logic_state else "N/A"

    logic_state_preview.short_description = "로직 상태"

    # pattern_stats 미리보기
    def pattern_stats_preview(self, obj):
        return str(obj.pattern_stats)[:50] + "..." if obj.pattern_stats else "N/A"

    pattern_stats_preview.short_description = "패턴 통계"


# ----------------------------------------------------
# 2. Ticket 관련 모델들 (ThreeTicket 등) 등록
# ----------------------------------------------------
# Ticket 모델들을 DRY (Don't Repeat Yourself) 하게 등록하는 헬퍼 함수
def register_ticket_model(model_class, name):
    class TicketAdmin(admin.ModelAdmin):
        list_display = (
            "user",
            "_pattern_preview",
            "tpattern_preview",
            "upattern_preview",
            "npattern_preview",
        )
        search_fields = ("user__username",)
        raw_id_fields = ("user",)  # 사용자 선택 시 검색 위젯 제공

        def get_form(self, request, obj=None, **kwargs):
            form = super().get_form(request, obj, **kwargs)
            json_fields = ["_pattern", "tpattern", "upattern", "npattern"]
            for field in json_fields:
                if field in form.base_fields:
                    form.base_fields[field].widget = JSONEditorWidget(
                        width="100%",
                        height="150px",
                        options={
                            "mode": "code",
                            "modes": ["code", "tree"],
                            "navigationBar": True,
                        },
                    )
            return form

        def _pattern_preview(self, obj):
            return str(obj._pattern)[:50] + "..." if obj._pattern else "N/A"

        _pattern_preview.short_description = "_Pattern"

        def tpattern_preview(self, obj):
            return str(obj.tpattern)[:50] + "..." if obj.tpattern else "N/A"

        tpattern_preview.short_description = "TPattern"

        def upattern_preview(self, obj):
            return str(obj.upattern)[:50] + "..." if obj.upattern else "N/A"

        upattern_preview.short_description = "UPattern"

        def npattern_preview(self, obj):
            return str(obj.npattern)[:50] + "..." if obj.npattern else "N/A"

        npattern_preview.short_description = "NPattern"

    admin.site.register(model_class, TicketAdmin)


# 각 Ticket 모델 등록
register_ticket_model(ThreeTicket, "3매 티켓")
register_ticket_model(FourTicket, "4매 티켓")
register_ticket_model(FiveTicket, "5매 티켓")
register_ticket_model(SixTicket, "6매 티켓")


# ----------------------------------------------------
# 3. BaccaraConfigAdmin (바카라 전역 설정) - 기존 코드 수정 및 유지
# ----------------------------------------------------
@admin.register(BaccaraConfig)
class BaccaraConfigAdmin(admin.ModelAdmin):
    list_display = (
        "logic1_enabled",
        "logic2_enabled",
        "logic3_enabled",
        "logic4_enabled",
        "ai_logic_enabled",
        "profit_rate_preview",
        "another_setting",
    )
    fieldsets = (
        (
            "로직 활성화/비활성화",  # 필드셋 제목 변경
            {
                "fields": (
                    (
                        "logic1_enabled",
                        "logic2_enabled",
                        "logic3_enabled",
                        "logic4_enabled",
                        "ai_logic_enabled",  # AI 로직 활성화 필드 추가
                    ),
                ),
                "description": "각 로직의 활성화 여부를 설정합니다.",
            },
        ),
        (
            "로직2 패턴 설정",
            {
                "fields": ("logic2_patterns",),
                "description": "로직2에서 사용될 패턴 시퀀스를 정의합니다. (예: [[1,1,-1,...], [-1,-1,1,...]])",
            },
        ),
        (
            "로직3 패턴 설정",
            {
                "fields": ("logic3_patterns",),
                "description": '로직3에서 사용될 패턴 시퀀스 및 개수를 정의합니다. (예: {"pattern_count": 10, "sequences": [[1,1,1,...], ...]})',
            },
        ),
        (
            "기타 설정",
            {
                "fields": ("profit_rate", "another_setting"),
                "description": "전역적으로 사용될 기타 설정값입니다.",
            },
        ),
    )

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.base_fields["logic2_patterns"].widget = JSONEditorWidget(
            width="100%",
            height="400px",
            options={"mode": "code", "modes": ["code", "tree"], "navigationBar": True},
        )
        form.base_fields["logic3_patterns"].widget = JSONEditorWidget(
            width="100%",
            height="400px",
            options={"mode": "code", "modes": ["code", "tree"], "navigationBar": True},
        )
        return form

    def profit_rate_preview(self, obj):
        return (
            obj.profit_rate[:50] + "..."
            if len(obj.profit_rate) > 50
            else obj.profit_rate
        )

    profit_rate_preview.short_description = "수익률 설정 미리보기"

    def has_delete_permission(self, request, obj=None):
        return BaccaraConfig.objects.count() > 1 if obj else True

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if not qs.exists():
            BaccaraConfig.load()
        return qs


# ----------------------------------------------------
# 4. ClsLogAdmin (클래스 로그) 등록
# ----------------------------------------------------
@admin.register(ClsLog)
class ClsLogAdmin(admin.ModelAdmin):
    list_display = ("gubun", "log_preview", "log_datetime")
    list_filter = ("gubun", "log_datetime")
    search_fields = ("gubun", "log")
    readonly_fields = ("log_datetime",)

    def log_preview(self, obj):
        return obj.log[:100] + "..." if len(obj.log) > 100 else obj.log

    log_preview.short_description = "로그 내용"


# ----------------------------------------------------
# 5. BroadcastMessageAdmin (전체 공지 메시지) - 기존 코드 유지
# ----------------------------------------------------
@admin.register(BroadcastMessage)
class BroadcastMessageAdmin(admin.ModelAdmin):
    list_display = (
        "category",
        "message_preview",
        "created_by",
        "created_at",
        "is_active",
    )
    list_filter = ("category", "is_active", "created_at")
    search_fields = ("message", "created_by__username", "category")
    readonly_fields = ("created_at",)
    actions = ["make_active", "make_inactive"]

    def message_preview(self, obj):
        return obj.message[:50] + "..." if len(obj.message) > 50 else obj.message

    message_preview.short_description = "메시지 미리보기"

    def make_active(self, request, queryset):
        queryset.update(is_active=True)
        self.message_user(request, "선택된 메시지들을 활성화했습니다.", level="success")

    make_active.short_description = "선택된 메시지를 활성화"

    def make_inactive(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(
            request, "선택된 메시지들을 비활성화했습니다.", level="success"
        )

    make_inactive.short_description = "선택된 메시지를 비활성화"

    def save_model(self, request, obj, form, change):
        if not obj.pk:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
