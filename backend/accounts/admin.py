from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import Artist, Follow, User, UserPreferences


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("email",)
    list_display = ("email", "display_name", "role", "subscription_tier", "is_staff")
    list_filter = ("role", "subscription_tier", "is_staff")
    search_fields = ("email", "display_name", "username")
    readonly_fields = ("id", "username", "created_at", "last_login")
    fieldsets = (
        (None, {"fields": ("id", "email", "password")}),
        ("Profile", {"fields": ("display_name", "username", "role", "gender",
                                 "birth_date", "avatar", "avatar_seed")}),
        ("Subscription", {"fields": ("subscription_tier", "subscription_renews_at")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser",
                                    "groups", "user_permissions")}),
        ("Dates", {"fields": ("created_at", "last_login")}),
    )
    add_fieldsets = (
        (None, {"classes": ("wide",),
                "fields": ("email", "display_name", "role", "password1", "password2")}),
    )


@admin.register(Artist)
class ArtistAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "verified", "follower_count", "total_streams")
    list_filter = ("status", "verified")
    search_fields = ("name",)


admin.site.register(Follow)
admin.site.register(UserPreferences)
