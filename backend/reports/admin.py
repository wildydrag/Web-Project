from django.contrib import admin

from .models import Payout, StreamEvent


@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display = ("id", "artist", "period", "unique_listeners", "total_streams",
                    "reward_toman", "status")
    list_filter = ("status", "period")


@admin.register(StreamEvent)
class StreamEventAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "song", "created_at")
