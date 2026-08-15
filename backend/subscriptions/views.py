"""Subscription API: plans, checkout, verify callback, and admin pricing."""

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.constants import BILLING_PERIODS
from common.permissions import IsAdmin

from .models import PlatformSettings
from .serializers import (
    CheckoutSerializer,
    PaymentSerializer,
    PlatformSettingsSerializer,
    SubscriptionSerializer,
    VerifySerializer,
)
from .services import create_checkout, verify_payment


class PlansView(APIView):
    """Current prices + billing periods for the pricing/upgrade screen."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        settings_obj = PlatformSettings.load()
        return Response({
            "prices": {"silver": settings_obj.silver_price, "gold": settings_obj.gold_price},
            "billing_periods": list(BILLING_PERIODS),
        })


class CheckoutView(APIView):
    """Start a subscription purchase; returns the gateway redirect URL."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment, redirect_url = create_checkout(
            request.user, serializer.validated_data["tier"],
            serializer.validated_data["billing_period"],
        )
        return Response({
            "payment_id": payment.id,
            "authority": payment.authority,
            "redirect_url": redirect_url,
        })


class VerifyView(APIView):
    """Handle the post-payment callback: verify and (on success) activate."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = verify_payment(
            request.user, serializer.validated_data["authority"],
            serializer.validated_data.get("status", ""),
        )
        if payment is None:
            return Response({"detail": "تراکنش یافت نشد."}, status=404)
        data = {"status": payment.status, "payment": PaymentSerializer(payment).data}
        if payment.subscription_id:
            data["subscription"] = SubscriptionSerializer(payment.subscription).data
        return Response(data)


class PlatformSettingsView(APIView):
    """Read prices (any user); update prices (admin only) — no code change."""

    def get_permissions(self):
        return [IsAdmin()] if self.request.method == "PATCH" else [IsAuthenticated()]

    def get(self, request):
        return Response(PlatformSettingsSerializer(PlatformSettings.load()).data)

    def patch(self, request):
        serializer = PlatformSettingsSerializer(
            PlatformSettings.load(), data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
