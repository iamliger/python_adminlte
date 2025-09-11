# accounts/urls.py

from django.urls import path
from .views import RegisterView, ApprovalPendingView, CurrentlyLoggedInUsersView

app_name = "accounts"

urlpatterns = [
    # path("login/", CustomLoginView.as_view(), name="login"),
    # path("register/", RegisterView.as_view(), name="register"),
    # path("logout/", CustomLogoutView.as_view(), name="logout"),  # CustomLogoutView 사용
    path("approval-pending/", ApprovalPendingView.as_view(), name="approval_pending"),
    path(
        "currently-logged-in-users/",
        CurrentlyLoggedInUsersView.as_view(),
        name="currently_logged_in_users",
    ),
]
