"""Subscription checkout/verify flow (gateway-agnostic)."""

import calendar

from django.conf import settings
from django.utils import timezone

from common.constants import PaymentStatus

from .gateways import PaymentVerifyResult, get_gateway
from .models import Payment, PlatformSettings, Subscription


def _add_months(dt, months):
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def create_checkout(user, tier, billing_period):
    """Create a pending Payment and hand back the gateway redirect URL."""
    amount = PlatformSettings.load().price_for(tier) * billing_period
    gateway = get_gateway()
    payment = Payment.objects.create(
        user=user, tier=tier, billing_period=billing_period, amount=amount,
        gateway=gateway.name, status=PaymentStatus.PENDING,
    )
    result = gateway.request_payment(
        amount=amount, description=f"اشتراک {tier}",
        callback_url=settings.PAYMENT_CALLBACK_URL,
    )
    payment.authority = result.authority
    payment.save(update_fields=["authority"])
    return payment, result.redirect_url


def verify_payment(user, authority, status):
    """Confirm a callback: verify with the gateway, then activate on success."""
    payment = Payment.objects.filter(
        user=user, authority=authority, status=PaymentStatus.PENDING
    ).first()
    if payment is None:
        return None

    if status and str(status).upper() == "OK":
        result = get_gateway().verify_payment(authority=authority, amount=payment.amount)
    else:
        result = PaymentVerifyResult(success=False)

    if result.success:
        _activate(payment, result.ref_id)
    else:
        payment.status = PaymentStatus.FAILED
        payment.save(update_fields=["status"])
    return payment


def _activate(payment, ref_id):
    now = timezone.now()
    end = _add_months(now, payment.billing_period)
    subscription = Subscription.objects.create(
        user=payment.user, tier=payment.tier, billing_period=payment.billing_period,
        price_paid=payment.amount, start_at=now, end_at=end,
    )
    payment.subscription = subscription
    payment.ref_id = ref_id
    payment.status = PaymentStatus.SUCCESS
    payment.save(update_fields=["subscription", "ref_id", "status"])

    user = payment.user
    user.subscription_tier = payment.tier
    user.subscription_renews_at = end
    user.save(update_fields=["subscription_tier", "subscription_renews_at"])
    return subscription
