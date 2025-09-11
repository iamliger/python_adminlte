# accounts/forms.py

from django import forms
from django.contrib.auth.forms import (
    UserCreationForm,
    UserChangeForm,
    AuthenticationForm,
)
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from baccara_analyse.core_utils import global_debug_log
import re  # 정규표현식 임포트

# CustomUser 모델을 가져옵니다.
User = get_user_model()

# 모든 필드에 적용될 Tailwind 기본 클래스 문자열을 정의
BASE_INPUT_CLASSES = "appearance-none block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"


class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = UserCreationForm.Meta.fields + ("email", "level")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        global_debug_log("CustomUserCreationForm: __init__() 호출됨")

        self.fields["username"].widget.attrs.update(
            {"class": BASE_INPUT_CLASSES, "placeholder": "사용자 이름"}
        )
        self.fields["email"].widget.attrs.update(
            {"class": BASE_INPUT_CLASSES, "placeholder": "이메일 주소"}
        )

        # UserCreationForm은 내부적으로 'password1'과 'password2' 필드를 생성합니다.
        # 이 필드들에 스타일을 직접 적용합니다.
        self.fields["password1"].widget.attrs.update(
            {"class": BASE_INPUT_CLASSES, "placeholder": "비밀번호"}
        )
        self.fields["password2"].widget.attrs.update(
            {"class": BASE_INPUT_CLASSES, "placeholder": "비밀번호 확인"}
        )

        # 'level' 필드도 Meta.fields에 추가했으므로, 여기서 스타일을 적용할 수 있습니다.
        if "level" in self.fields:
            self.fields["level"].widget.attrs.update(
                {
                    "class": BASE_INPUT_CLASSES.replace("pr-10", "pr-3"),
                    "placeholder": "사용자 레벨 (기본값 1)",
                }
            )

    def clean_email(self):
        email = self.cleaned_data.get("email")
        global_debug_log(
            f"CustomUserCreationForm: clean_email() 호출됨. 검사할 이메일: {email}"
        )
        if email and User.objects.filter(email=email).exists():
            raise forms.ValidationError(
                "이미 존재하는 이메일 주소입니다. 다른 이메일을 사용해주세요."
            )
        return email

    def clean_email(self):
        email = self.cleaned_data.get("email")
        global_debug_log(
            f"CustomUserCreationForm: clean_email() 호출됨. 검사할 이메일: {email}"
        )
        if email and User.objects.filter(email=email).exists():
            raise forms.ValidationError(
                "이미 존재하는 이메일 주소입니다. 다른 이메일을 사용해주세요."
            )
        return email

    def clean_username(self):
        username = self.cleaned_data.get("username")
        global_debug_log(
            f"CustomUserCreationForm: clean_username() 호출됨. 검사할 사용자 이름: {username}"
        )
        if username and User.objects.filter(username=username).exists():
            raise forms.ValidationError(
                "이미 존재하는 사용자 이름입니다. 다른 이름을 사용해주세요."
            )
        return username


class CustomUserChangeForm(UserChangeForm):
    class Meta(UserChangeForm.Meta):
        model = User
        fields = (
            "username",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "level",
            "groups",
            "user_permissions",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # self.fields["username"].widget.attrs.update(
        #     {"class": BASE_INPUT_CLASSES, "placeholder": "사용자 이름"}
        # )
        # self.fields["email"].widget.attrs.update(
        #     {"class": BASE_INPUT_CLASSES, "placeholder": "이메일 주소"}
        # )
        # # 여기에 비밀번호 필드에 대한 접근 코드를 추가하지 않습니다.


class CustomAuthenticationForm(AuthenticationForm):
    class Meta:
        model = User
        fields = ("username", "password")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        tailwind_classes = "appearance-none block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"

        self.fields["username"].widget.attrs.update(
            {
                "class": tailwind_classes,
                "placeholder": "이메일 주소",
                "autocomplete": "email",
                "type": "email",
            }
        )
        self.fields["password"].widget.attrs.update(
            {
                "class": tailwind_classes,
                "placeholder": "비밀번호",
                "autocomplete": "current-password",
            }
        )
