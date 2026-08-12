"""
Domain constants — the server-side single source of truth.

Mirrors the Phase 1 frontend ``lib/config.ts`` and the enums in ``lib/types.ts``
so tier rules, roles and genres live in exactly one place on the backend.
"""

from django.db import models


class Role(models.TextChoices):
    LISTENER = "listener", "شنونده"
    ARTIST = "artist", "هنرمند"
    SUPPORT = "support", "پشتیبان"
    ADMIN = "admin", "مدیر سامانه"


class SubscriptionTier(models.TextChoices):
    BASIC = "basic", "پایه"
    SILVER = "silver", "نقره‌ای"
    GOLD = "gold", "طلایی"


class Gender(models.TextChoices):
    MALE = "male", "مرد"
    FEMALE = "female", "زن"
    OTHER = "other", "دیگر"
    UNSPECIFIED = "unspecified", "نامشخص"


class ArtistStatus(models.TextChoices):
    PENDING = "pending", "در انتظار تایید"
    APPROVED = "approved", "تاییدشده"
    REJECTED = "rejected", "ردشده"


class ReleaseType(models.TextChoices):
    ALBUM = "album", "آلبوم"
    SINGLE = "single", "تک‌آهنگ"


class TicketStatus(models.TextChoices):
    OPEN = "open", "باز"
    ANSWERED = "answered", "پاسخ داده‌شده"
    CLOSED = "closed", "بسته‌شده"


class PayoutStatus(models.TextChoices):
    PENDING = "pending", "در انتظار پرداخت"
    SETTLED = "settled", "تسویه‌شده"


class PaymentStatus(models.TextChoices):
    PENDING = "pending", "در حال انجام"
    SUCCESS = "success", "موفق"
    FAILED = "failed", "ناموفق"


class NotificationKind(models.TextChoices):
    SUBSCRIPTION_EXPIRING = "subscription_expiring", "اتمام اشتراک"
    NEW_RELEASE = "new_release", "اثر جدید"
    ARTIST_VERDICT = "artist_verdict", "نتیجه احراز هویت"
    ARTIST_PAYOUT = "artist_payout", "پرداخت هنرمند"
    NEW_TICKET = "new_ticket", "تیکت جدید"
    NEW_ARTIST_REQUEST = "new_artist_request", "درخواست هنرمند جدید"


class Genre(models.TextChoices):
    POP = "pop", "پاپ"
    ROCK = "rock", "راک"
    TRADITIONAL = "traditional", "سنتی"
    ELECTRONIC = "electronic", "الکترونیک"
    HIPHOP = "hiphop", "هیپ‌هاپ"
    CLASSICAL = "classical", "کلاسیک"
    JAZZ = "jazz", "جز"
    FOLK = "folk", "فولک"


class Language(models.TextChoices):
    FA = "fa", "فارسی"
    EN = "en", "English"


# Billing periods offered at checkout, in months.
BILLING_PERIODS = (1, 3, 6, 12)


class TierBenefits:
    """Per-tier limits/benefits. ``daily_stream_limit``/``playlist_limit`` are
    ``None`` when unlimited."""

    def __init__(self, *, daily_stream_limit, playlist_limit, can_upload_avatar,
                 can_download, early_access, can_view_stats):
        self.daily_stream_limit = daily_stream_limit
        self.playlist_limit = playlist_limit
        self.can_upload_avatar = can_upload_avatar
        self.can_download = can_download
        self.early_access = early_access
        self.can_view_stats = can_view_stats


TIERS: dict[str, TierBenefits] = {
    SubscriptionTier.BASIC: TierBenefits(
        daily_stream_limit=60, playlist_limit=6, can_upload_avatar=False,
        can_download=False, early_access=False, can_view_stats=False,
    ),
    SubscriptionTier.SILVER: TierBenefits(
        daily_stream_limit=None, playlist_limit=100, can_upload_avatar=True,
        can_download=True, early_access=False, can_view_stats=False,
    ),
    SubscriptionTier.GOLD: TierBenefits(
        daily_stream_limit=None, playlist_limit=None, can_upload_avatar=True,
        can_download=True, early_access=True, can_view_stats=True,
    ),
}

# Default monthly prices in Toman (admin-editable at runtime via PlatformSettings).
DEFAULT_SILVER_PRICE = 79000
DEFAULT_GOLD_PRICE = 149000

# Default artist payout rates in Toman, also admin-editable at runtime.
# reward = streams x per_stream + unique_listeners x per_listener
DEFAULT_PAYOUT_PER_STREAM = 2
DEFAULT_PAYOUT_PER_LISTENER = 50
