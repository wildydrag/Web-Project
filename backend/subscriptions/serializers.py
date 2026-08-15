"""Subscription serializers."""

from rest_framework import serializers

from common.constants import BILLING_PERIODS, SubscriptionTier

from .models import Payment, PlatformSettings, Subscription


class CheckoutSerializer(serializers.Serializer):
    tier = serializers.ChoiceField(
        choices=[(SubscriptionTier.SILVER, "silver"), (SubscriptionTier.GOLD, "gold")]
    )
    billing_period = serializers.ChoiceField(choices=[(p, str(p)) for p in BILLING_PERIODS])


class VerifySerializer(serializers.Serializer):
    authority = serializers.CharField()
    status = serializers.CharField(required=False, allow_blank=True, default="")


class SubscriptionSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(read_only=True)

    class Meta:
        model = Subscription
        fields = ["id", "user_id", "tier", "billing_period", "price_paid", "start_at", "end_at"]


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "tier", "billing_period", "amount", "gateway", "status", "created_at"]


class PlatformSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformSettings
        fields = ["silver_price", "gold_price"]
