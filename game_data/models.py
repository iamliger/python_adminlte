# baccara_analyse/game_data/models.py

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

User = get_user_model()

MESSAGE_CATEGORIES = [
    ("notice", "공지사항"),
    ("event", "이벤트"),
    ("warning", "경고"),
    ("info", "정보"),
    ("system", "시스템"),
]


# ----------------------------------------------------
# 1. BaccaraDB 모델 (메인 게임 데이터) - 필드명 조정 및 PK/관계 재정의
# ----------------------------------------------------
class BaccaraDB(models.Model):
    # 기존 CREATE TABLE에 맞춰 idx를 기본 키로 사용합니다.
    idx = models.AutoField(primary_key=True, verbose_name="인덱스")
    # memberid를 UNIQUE 인덱스로 사용하고, CustomUser의 username과 연결합니다.
    memberid = models.CharField(
        max_length=50, default="0", unique=True, verbose_name="회원 ID"
    )
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        to_field="username",  # CustomUser의 username 필드와 연결합니다.
        related_name="bacaradb_profile",  # 역참조 이름 충돌 방지
        verbose_name="사용자 계정",
    )

    dayinfo = models.CharField(
        max_length=10, default="0", blank=True, verbose_name="날짜 정보"
    )
    bcdata = models.TextField(blank=True, verbose_name="바카라 데이터 (조보 문자열)")
    basetable = models.TextField(blank=True, verbose_name="베이스 테이블")

    # 컬럼명을 CREATE TABLE 문에 명시된 대문자 패턴 이름과 정확히 일치시킵니다.
    Pattern_3 = models.JSONField(
        default=list, blank=True, null=True, verbose_name="3Pattern"
    )
    Pattern_4 = models.JSONField(
        default=list, blank=True, null=True, verbose_name="4Pattern"
    )
    Pattern_5 = models.JSONField(
        default=list, blank=True, null=True, verbose_name="5Pattern"
    )
    Pattern_6 = models.JSONField(
        default=list, blank=True, null=True, verbose_name="6Pattern"
    )

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
    )
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
    )

    selected_logic = models.CharField(
        max_length=10, default="logic1", verbose_name="선택된 로직"
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name="생성 시간")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="업데이트 시간")

    class Meta:
        db_table = "bacaradb"
        verbose_name = "바카라 게임 데이터"
        verbose_name_plural = "바카라 게임 데이터"

    def __str__(self):
        return f"{self.memberid}의 바카라 데이터"


# ----------------------------------------------------
# 2. Ticket 관련 모델들 (ThreeTicket, FourTicket 등) - 필드명 조정 및 관계 재정의
# ----------------------------------------------------
class ThreeTicket(models.Model):
    idx = models.AutoField(primary_key=True, verbose_name="인덱스")
    memberid = models.CharField(
        max_length=50, default="0", unique=True, verbose_name="회원 ID"
    )
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        to_field="username",
        related_name="threeticket_record",  # 역참조 이름 충돌 방지
        verbose_name="사용자 계정",
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
        return f"{self.memberid}의 3매 티켓"


class FourTicket(models.Model):
    idx = models.AutoField(primary_key=True, verbose_name="인덱스")
    memberid = models.CharField(
        max_length=50, default="0", unique=True, verbose_name="회원 ID"
    )
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        to_field="username",
        related_name="fourticket_record",  # 역참조 이름 충돌 방지
        verbose_name="사용자 계정",
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
        return f"{self.memberid}의 4매 티켓"


class FiveTicket(models.Model):
    idx = models.AutoField(primary_key=True, verbose_name="인덱스")
    memberid = models.CharField(
        max_length=50, default="0", unique=True, verbose_name="회원 ID"
    )
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        to_field="username",
        related_name="fiveticket_record",  # 역참조 이름 충돌 방지
        verbose_name="사용자 계정",
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
        return f"{self.memberid}의 5매 티켓"


class SixTicket(models.Model):
    idx = models.AutoField(primary_key=True, verbose_name="인덱스")
    memberid = models.CharField(
        max_length=50, default="0", unique=True, verbose_name="회원 ID"
    )
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        to_field="username",
        related_name="sixticket_record",  # 역참조 이름 충돌 방지
        verbose_name="사용자 계정",
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
        return f"{self.memberid}의 6매 티켓"


# ----------------------------------------------------
# 3. BaccaraConfig 모델 (전역 설정) - 기존 코드 수정 및 유지
# ----------------------------------------------------
class BaccaraConfig(models.Model):
    # 기존 PHP 스키마의 bc_id (int)와 유사하게, pk=1로 고정하여 사용
    id = models.IntegerField(
        primary_key=True, default=1, verbose_name="설정 ID"
    )  # bc_id에 대응

    logic1_enabled = models.BooleanField(default=True, verbose_name="로직1 활성화")
    logic2_enabled = models.BooleanField(default=True, verbose_name="로직2 활성화")
    logic3_enabled = models.BooleanField(default=True, verbose_name="로직3 활성화")
    logic4_enabled = models.BooleanField(default=True, verbose_name="로직4 활성화")
    ai_logic_enabled = models.BooleanField(
        default=False, verbose_name="AI 로직 활성화 (추후)"
    )

    logic2_patterns = models.JSONField(
        default=list,
        blank=True,
        null=True,
        verbose_name="로직2 패턴 시퀀스 (배열의 배열)",
    )

    logic3_patterns = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        verbose_name="로직3 패턴 정의 (개수 및 시퀀스)",
    )

    profit_rate = models.TextField(blank=True, verbose_name="수익률 설정")
    another_setting = models.CharField(
        max_length=255, blank=True, verbose_name="기타 설정"
    )

    class Meta:
        db_table = "baccara_config"  # 기존 테이블명 유지
        verbose_name = "바카라 설정"
        verbose_name_plural = "바카라 설정"

    def __str__(self):
        return "바카라 전역 설정"

    def save(self, *args, **kwargs):
        if not self.pk and BaccaraConfig.objects.exists():
            raise ValidationError("BaccaraConfig 인스턴스는 하나만 존재할 수 있습니다.")
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj


# ----------------------------------------------------
# 4. ClsLog 모델 (로그 기록) - 기존 코드 수정 및 유지
# ----------------------------------------------------
class ClsLog(models.Model):
    idx = models.AutoField(primary_key=True, verbose_name="인덱스")
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
    # Django 기본 ID 필드를 사용
    id = models.AutoField(primary_key=True)

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
