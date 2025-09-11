# game_data/models.py 예시 (bacaradb 모델)
from django.db import models
from django.contrib.auth import get_user_model
from accounts.models import CustomUser  # CustomUser 모델 임포트
from django.core.exceptions import ValidationError


# CustomUser 모델을 가져옵니다.
User = get_user_model()

# BroadcastMessage 카테고리 선택지 정의
MESSAGE_CATEGORIES = [
    ("notice", "공지사항"),
    ("event", "이벤트"),
    ("warning", "경고"),
    ("info", "정보"),
    ("system", "시스템"),
]


# ----------------------------------------------------
# 1. BaccaraDB 모델 (메인 게임 데이터)
# ----------------------------------------------------
class BaccaraDB(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, verbose_name="사용자"
    )
    dayinfo = models.CharField(
        max_length=10, default="0", blank=True, verbose_name="날짜 정보"
    )
    bcdata = models.TextField(
        blank=True, verbose_name="바카라 데이터 (조보 문자열)"
    )  # bcdata는 길어질 수 있으므로 TextField
    basetable = models.TextField(
        blank=True, verbose_name="베이스 테이블"
    )  # basetable도 길어질 수 있으므로 TextField
    pattern_3 = models.JSONField(
        default=list, blank=True, null=True, verbose_name="3Pattern"
    )
    pattern_4 = models.JSONField(
        default=list, blank=True, null=True, verbose_name="4Pattern"
    )
    pattern_5 = models.JSONField(
        default=list, blank=True, null=True, verbose_name="5Pattern"
    )
    pattern_6 = models.JSONField(
        default=list, blank=True, null=True, verbose_name="6Pattern"
    )

    # PHP 코드에 직접적인 사용은 없지만 DB 스키마에 존재하는 필드들
    ptn = models.TextField(blank=True, verbose_name="패턴 (ptn)")
    ptnhistory = models.TextField(blank=True, verbose_name="패턴 히스토리")
    baseresult = models.TextField(blank=True, verbose_name="기본 결과")
    coininfo = models.TextField(blank=True, verbose_name="코인 정보")
    chartResult = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="차트 결과"
    )
    pattern_stats = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="패턴 통계"
    )

    logic_state = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="로직 상태"
    )
    logic3_patterns = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="로직3 패턴 (구버전)"
    )  # 이전 php 스키마에서 남아있던 필드
    analytics_data = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="분석 데이터"
    )
    virtual_stats = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="가상 통계"
    )
    game_history = models.JSONField(
        default=list, blank=True, null=True, verbose_name="게임 히스토리"
    )
    logic2_state = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="로직2 상태 (구버전)"
    )  # 이전 php 스키마에서 남아있던 필드

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 시간")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="업데이트 시간")

    class Meta:
        db_table = "bacaradb"  # 기존 테이블명 유지
        verbose_name = "바카라 게임 데이터"
        verbose_name_plural = "바카라 게임 데이터"

    def __str__(self):
        return f"{self.user.username}의 바카라 데이터"


# ----------------------------------------------------
# 2. Ticket 관련 모델들 (ThreeTicket, FourTicket 등)
# ----------------------------------------------------
class ThreeTicket(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, verbose_name="사용자"
    )
    _pattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="_Pattern"
    )
    tpattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="TPattern"
    )
    upattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="UPattern"
    )
    npattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="NPattern"
    )

    class Meta:
        db_table = "3ticket"
        verbose_name = "3매 티켓"
        verbose_name_plural = "3매 티켓"

    def __str__(self):
        return f"{self.user.username}의 3매 티켓"


class FourTicket(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, verbose_name="사용자"
    )
    _pattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="_Pattern"
    )
    tpattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="TPattern"
    )
    upattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="UPattern"
    )
    npattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="NPattern"
    )

    class Meta:
        db_table = "4ticket"
        verbose_name = "4매 티켓"
        verbose_name_plural = "4매 티켓"

    def __str__(self):
        return f"{self.user.username}의 4매 티켓"


class FiveTicket(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, verbose_name="사용자"
    )
    _pattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="_Pattern"
    )
    tpattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="TPattern"
    )
    upattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="UPattern"
    )
    npattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="NPattern"
    )

    class Meta:
        db_table = "5ticket"
        verbose_name = "5매 티켓"
        verbose_name_plural = "5매 티켓"

    def __str__(self):
        return f"{self.user.username}의 5매 티켓"


class SixTicket(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, primary_key=True, verbose_name="사용자"
    )
    _pattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="_Pattern"
    )
    tpattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="TPattern"
    )
    upattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="UPattern"
    )
    npattern = models.JSONField(
        default=dict, blank=True, null=True, verbose_name="NPattern"
    )

    class Meta:
        db_table = "6ticket"
        verbose_name = "6매 티켓"
        verbose_name_plural = "6매 티켓"

    def __str__(self):
        return f"{self.user.username}의 6매 티켓"


# ----------------------------------------------------
# 3. BaccaraConfig 모델 (전역 설정) - 이전 코드 수정 및 유지
# ----------------------------------------------------
class BaccaraConfig(models.Model):
    logic1_enabled = models.BooleanField(default=True, verbose_name="로직1 활성화")
    logic2_enabled = models.BooleanField(default=True, verbose_name="로직2 활성화")
    logic3_enabled = models.BooleanField(default=True, verbose_name="로직3 활성화")
    logic4_enabled = models.BooleanField(default=True, verbose_name="로직4 활성화")
    ai_logic_enabled = models.BooleanField(
        default=False, verbose_name="AI 로직 활성화 (추후)"
    )  # AI 로직 활성화 필드 추가

    # 로직2 패턴 정의 (붙붙꺽, 꺽꺽붙 등)
    logic2_patterns = models.JSONField(
        default=list,
        blank=True,
        null=True,
        verbose_name="로직2 패턴 시퀀스 (배열의 배열)",
    )

    # 로직3 패턴 정의 (개수 및 시퀀스)
    logic3_patterns = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        verbose_name="로직3 패턴 정의 (개수 및 시퀀스)",
    )

    # 기타 설정
    profit_rate = models.TextField(blank=True, verbose_name="수익률 설정")
    another_setting = models.CharField(
        max_length=255, blank=True, verbose_name="기타 설정"
    )

    class Meta:
        verbose_name = "바카라 설정"
        verbose_name_plural = "바카라 설정"

    def __str__(self):
        return "바카라 전역 설정"

    # 이 모델의 인스턴스가 하나만 존재하도록 하는 메서드
    def save(self, *args, **kwargs):
        if not self.pk and BaccaraConfig.objects.exists():
            raise ValidationError("BaccaraConfig 인스턴스는 하나만 존재할 수 있습니다.")
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


# ----------------------------------------------------
# 4. ClsLog 모델 (로그 기록)
# ----------------------------------------------------
class ClsLog(models.Model):
    gubun = models.CharField(max_length=50, blank=True, verbose_name="로그 구분")
    log = models.TextField(blank=True, verbose_name="로그 내용")
    log_datetime = models.DateTimeField(auto_now_add=True, verbose_name="로그 시간")

    class Meta:
        db_table = "clslog"
        verbose_name = "클래스 로그"
        verbose_name_plural = "클래스 로그"
        ordering = ["-log_datetime"]

    def __str__(self):
        return f"[{self.gubun}] {self.log[:50]}..."


# ----------------------------------------------------
# 5. BroadcastMessage 모델 (전체 공지 메시지) - 기존 내용 유지
# ----------------------------------------------------
class BroadcastMessage(models.Model):
    category = models.CharField(
        max_length=20,
        choices=MESSAGE_CATEGORIES,
        default="notice",
        verbose_name="카테고리",
    )
    message = models.TextField(verbose_name="메시지 내용")
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="작성자"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="작성 시간")
    is_active = models.BooleanField(default=True, verbose_name="활성 여부")

    class Meta:
        verbose_name = "전체 공지 메시지"
        verbose_name_plural = "전체 공지 메시지"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.get_category_display()}] {self.message[:30]}..."
