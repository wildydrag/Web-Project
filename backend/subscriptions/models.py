"""Subscription domain: platform pricing, subscriptions, and payments."""

from django.db import models

from accounts.models import User
from common.constants import (
    DEFAULT_GOLD_PRICE,
    DEFAULT_PAYOUT_PER_LISTENER,
    DEFAULT_PAYOUT_PER_STREAM,
    DEFAULT_SILVER_PRICE,
    PaymentStatus,
    SubscriptionTier,
)
from common.models import PrefixedIDModel, TimeStampedModel


class PlatformSettings(models.Model):
    """Admin-editable platform configuration (singleton row).

    Prices live here — not in code — so the admin can change them at runtime
    without a deploy (spec requirement).
    """

    silver_price = models.PositiveIntegerField(default=DEFAULT_SILVER_PRICE)
    gold_price = models.PositiveIntegerField(default=DEFAULT_GOLD_PRICE)

    # Artist payout rates, in Toman. Editable at runtime for the same reason
    # prices are: the admin can retune payouts without a code change.
    payout_per_stream = models.PositiveIntegerField(
        default=DEFAULT_PAYOUT_PER_STREAM,
        help_text="Toman paid per recorded stream",
    )
    payout_per_listener = models.PositiveIntegerField(
        default=DEFAULT_PAYOUT_PER_LISTENER,
        help_text="Toman paid per unique listener in the period",
    )

    class Meta:
        verbose_name = "platform settings"
        verbose_name_plural = "platform settings"

    def __str__(self):
        return "PlatformSettings"

    @classmethod
    def load(cls) -> "PlatformSettings":
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def price_for(self, tier: str) -> int:
        return {
            SubscriptionTier.SILVER: self.silver_price,
            SubscriptionTier.GOLD: self.gold_price,
        }.get(tier, 0)


class Subscription(PrefixedIDModel):
    """A purchased subscription period (history + current-window record)."""

    id_prefix = "sub"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="subscriptions")
    tier = models.CharField(max_length=16, choices=SubscriptionTier.choices)
    billing_period = models.PositiveSmallIntegerField(help_text="months")
    price_paid = models.PositiveIntegerField()
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user_id} · {self.tier} ({self.billing_period}mo)"


class Payment(PrefixedIDModel, TimeStampedModel):
    """A checkout attempt against a payment gateway (pending → success/failed)."""

    id_prefix = "pay"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payments")
    tier = models.CharField(max_length=16, choices=SubscriptionTier.choices)
    billing_period = models.PositiveSmallIntegerField(help_text="months")
    amount = models.PositiveIntegerField()
    gateway = models.CharField(max_length=32)
    authority = models.CharField(max_length=128, blank=True)  # gateway token
    ref_id = models.CharField(max_length=128, blank=True)     # settlement ref
    status = models.CharField(
        max_length=16, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )
    subscription = models.OneToOneField(
        Subscription, on_delete=models.SET_NULL, null=True, blank=True, related_name="payment"
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.id} · {self.status}"
