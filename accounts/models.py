# accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    # 기존 username 필드를 유지하면서 email을 로그인 필드로 사용
    email = models.EmailField(unique=True, verbose_name="이메일 주소")
    level = models.IntegerField(default=1, verbose_name="사용자 레벨")  # 기본값 레벨1

    # USERNAME_FIELD를 'email'로 설정하여 이메일로 로그인
    USERNAME_FIELD = "email"
    # createsuperuser 시 요구되는 필드 목록. email은 USERNAME_FIELD이므로 여기에 포함하지 않음.
    REQUIRED_FIELDS = ["username"]

    # 역방향 접근자(reverse accessor) 충돌 방지를 위한 related_name 명시
    groups = models.ManyToManyField(
        "auth.Group",
        verbose_name=("groups"),
        blank=True,
        help_text=(
            "The groups this user belongs to. A user will get all permissions "
            "granted to each of their groups."
        ),
        related_name="customuser_groups_set",  # 고유한 related_name
        related_query_name="customuser_group",
    )
    user_permissions = models.ManyToManyField(
        "auth.Permission",
        verbose_name=("user permissions"),
        blank=True,
        help_text=("Specific permissions for this user."),
        related_name="customuser_user_permissions_set",  # 또 다른 고유한 related_name
        related_query_name="customuser_permission",
    )

    def __str__(self):
        return self.email  # 관리자 페이지 등에서 사용자 식별을 위해 이메일 반환

    # Meta 클래스에서 db_table을 제거하여 Django가 AUTH_USER_MODEL에 따라 테이블을 생성하도록 함
    # class Meta:
    #     db_table = 'auth_user' # 이 줄을 제거해야 합니다.
    #     verbose_name = '사용자'
    #     verbose_name_plural = '사용자'
