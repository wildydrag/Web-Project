from django.contrib import admin

from .models import Payment, PlatformSettings, Subscription


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ("id", "silver_price", "gold_price")


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "tier", "billing_period", "start_at", "end_at")
    list_filter = ("tier",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "tier", "amount", "gateway", "status", "created_at")
    list_filter = ("status", "gateway")
