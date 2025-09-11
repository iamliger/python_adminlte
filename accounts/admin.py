# accounts/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.urls import path
from .models import CustomUser
from .forms import CustomUserCreationForm, CustomUserChangeForm
from .views import (
    CurrentlyLoggedInUsersView,
    Logic2PatternManagementView,
    Logic3PatternManagementView,
)
from django_json_widget.widgets import JSONEditorWidget


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    add_form = CustomUserCreationForm
    form = CustomUserChangeForm
    model = CustomUser
    list_display = ["email", "username", "level", "is_staff", "is_active"]
    list_filter = ["is_staff", "is_active", "level"]

    fieldsets = UserAdmin.fieldsets + (
        ("추가 정보", {"fields": ("level",)}),  # <-- 'level'을 위한 새로운 필드셋 추가
    )

    add_fieldsets = (
        (None, {"fields": ("username", "email", "password1", "password2", "level")}),
    )
    search_fields = ["email", "username"]
    ordering = ["email"]

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path(
                "currently-logged-in-users/",
                admin.site.admin_view(CurrentlyLoggedInUsersView.as_view()),
                name="accounts_currently_logged_in_users",
            ),
            path(
                "game-logic/logic2-patterns/",
                admin.site.admin_view(Logic2PatternManagementView.as_view()),
                name="accounts_logic2_patterns_manage",
            ),
            path(
                "game-logic/logic3-patterns/",
                admin.site.admin_view(Logic3PatternManagementView.as_view()),
                name="accounts_logic3_patterns_manage",
            ),
        ]
        return custom_urls + urls
