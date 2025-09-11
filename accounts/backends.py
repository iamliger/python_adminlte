# accounts/backends.py
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model


class EmailBackend(ModelBackend):
    """
    이메일 주소와 비밀번호를 사용하여 사용자를 인증합니다.
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        UserModel = get_user_model()
        try:
            # username 인자로 이메일 주소가 전달된다고 가정
            user = UserModel.objects.get(email=username)
        except UserModel.DoesNotExist:
            return None  # 해당 이메일을 가진 사용자가 없음

        if user.check_password(password) and self.user_can_authenticate(user):
            return user  # 비밀번호가 일치하고 사용자가 활성화된 경우

        return None  # 인증 실패

    def get_user(self, user_id):
        """
        주어진 user_id에 해당하는 사용자를 반환합니다.
        """
        UserModel = get_user_model()
        try:
            return UserModel.objects.get(pk=user_id)
        except UserModel.DoesNotExist:
            return None
