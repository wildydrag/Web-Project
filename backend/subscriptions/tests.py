"""Subscription tests: checkout → verify → activation, and admin pricing."""

import pytest

from common.constants import PaymentStatus, SubscriptionTier
from subscriptions.models import Payment, PlatformSettings, Subscription

pytestmark = pytest.mark.django_db


def _checkout(client, tier="silver", period=1):
    return client.post(
        "/api/subscriptions/checkout/",
        {"tier": tier, "billingPeriod": period},
        format="json",
    )


def test_plans_returns_current_prices(api, auth, listener):
    body = auth(listener).get("/api/subscriptions/plans/").json()
    assert body["prices"]["silver"] == 79000
    assert body["prices"]["gold"] == 149000
    assert body["billingPeriods"] == [1, 3, 6, 12]


def test_checkout_creates_pending_payment_with_redirect(api, auth, listener):
    resp = _checkout(auth(listener), "silver", 1)
    assert resp.status_code == 200
    body = resp.json()
    assert "Authority=" in body["redirectUrl"]
    payment = Payment.objects.get(id=body["paymentId"])
    assert payment.status == PaymentStatus.PENDING
    assert payment.amount == 79000


def test_checkout_amount_scales_with_period(api, auth, listener):
    resp = _checkout(auth(listener), "gold", 3)
    payment = Payment.objects.get(id=resp.json()["paymentId"])
    assert payment.amount == 149000 * 3


def test_checkout_rejects_basic_tier(api, auth, listener):
    assert _checkout(auth(listener), "basic", 1).status_code == 400


def test_verify_success_activates_subscription(api, auth, listener):
    client = auth(listener)
    authority = _checkout(client, "silver", 1).json()["authority"]
    resp = client.post(
        "/api/subscriptions/verify/",
        {"authority": authority, "status": "OK"}, format="json",
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"
    listener.refresh_from_db()
    assert listener.subscription_tier == SubscriptionTier.SILVER
    assert listener.subscription_renews_at is not None
    assert Subscription.objects.filter(user=listener, tier="silver").exists()


def test_verify_failure_leaves_tier_unchanged(api, auth, listener):
    client = auth(listener)
    authority = _checkout(client, "gold", 1).json()["authority"]
    resp = client.post(
        "/api/subscriptions/verify/",
        {"authority": authority, "status": "NOK"}, format="json",
    )
    assert resp.json()["status"] == "failed"
    listener.refresh_from_db()
    assert listener.subscription_tier == SubscriptionTier.BASIC


def test_verify_is_scoped_to_own_payment(api, auth, listener, make_user):
    other = make_user("other@t.app")
    authority = _checkout(auth(make_user("buyer@t.app")), "silver", 1).json()["authority"]
    # a different user cannot verify someone else's transaction
    resp = auth(other).post(
        "/api/subscriptions/verify/",
        {"authority": authority, "status": "OK"}, format="json",
    )
    assert resp.status_code == 404


def test_admin_can_update_prices(api, auth, admin):
    resp = auth(admin).patch(
        "/api/platform-settings/", {"silverPrice": 99000}, format="json"
    )
    assert resp.status_code == 200
    assert PlatformSettings.load().silver_price == 99000


def test_non_admin_cannot_update_prices(api, auth, listener):
    resp = auth(listener).patch(
        "/api/platform-settings/", {"silverPrice": 1}, format="json"
    )
    assert resp.status_code == 403


def test_price_change_reflected_in_next_checkout(api, auth, admin, listener):
    auth(admin).patch("/api/platform-settings/", {"goldPrice": 200000}, format="json")
    payment = Payment.objects.get(
        id=_checkout(auth(listener), "gold", 1).json()["paymentId"]
    )
    assert payment.amount == 200000  # no code change needed
