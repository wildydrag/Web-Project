"""Subscription expiry: a lapsed plan must stop granting privileges.

The brief requires the system to track when a subscription ends and to make the
user renew it. Entitlements read :attr:`User.current_tier`, so expiry takes
effect immediately — the management command only keeps the stored column tidy.
"""

from datetime import timedelta

import pytest
from django.core.management import call_command
from django.utils import timezone

from common.constants import SubscriptionTier

pytestmark = pytest.mark.django_db


@pytest.fixture
def lapsed_gold(make_user):
    """A gold member whose plan ended yesterday."""
    return make_user(
        "lapsed@test.app",
        tier=SubscriptionTier.GOLD,
        subscription_renews_at=timezone.now() - timedelta(days=1),
    )


class TestCurrentTier:
    def test_an_active_plan_is_in_force(self, gold_listener):
        assert gold_listener.subscription_is_active is True
        assert gold_listener.current_tier == SubscriptionTier.GOLD

    def test_a_lapsed_plan_falls_back_to_basic(self, lapsed_gold):
        assert lapsed_gold.subscription_is_active is False
        assert lapsed_gold.current_tier == SubscriptionTier.BASIC

    def test_basic_never_lapses(self, listener):
        assert listener.subscription_is_active is True
        assert listener.current_tier == SubscriptionTier.BASIC

    def test_a_paid_tier_without_an_end_date_is_not_perpetual(self, make_user):
        """Safest reading of missing data: lapsed, never free-forever."""
        user = make_user(
            "nodate@test.app",
            tier=SubscriptionTier.GOLD,
            subscription_renews_at=None,
        )
        assert user.current_tier == SubscriptionTier.BASIC


class TestExpiryRevokesPrivileges:
    """Each tier benefit must follow the effective tier, not the stored one."""

    def test_expired_member_loses_early_access(self, api, auth, lapsed_gold, catalog):
        titles = [s["title"] for s in auth(lapsed_gold).get("/api/songs/").json()["results"]]
        assert "زودهنگام" not in titles

    def test_expired_member_is_capped_again(self, api, auth, lapsed_gold, catalog):
        from reports.models import StreamEvent
        song = catalog["normal"]
        for _ in range(60):  # the basic daily allowance
            StreamEvent.objects.create(user=lapsed_gold, song=song)
        assert auth(lapsed_gold).post(f"/api/songs/{song.id}/play/").status_code == 429

    def test_expired_member_loses_the_playlist_allowance(self, api, auth, lapsed_gold):
        client = auth(lapsed_gold)
        for i in range(6):  # basic allows six
            assert client.post("/api/playlists/", {"name": f"p{i}"}, format="json").status_code == 201
        assert client.post("/api/playlists/", {"name": "p7"}, format="json").status_code == 400

    def test_expired_member_cannot_upload_an_avatar(self, api, auth, lapsed_gold):
        from io import BytesIO
        from django.core.files.uploadedfile import SimpleUploadedFile
        from PIL import Image
        buf = BytesIO()
        Image.new("RGB", (2, 2), "red").save(buf, format="PNG")
        image = SimpleUploadedFile("a.png", buf.getvalue(), content_type="image/png")
        resp = auth(lapsed_gold).patch("/api/auth/me/", {"avatar": image}, format="multipart")
        assert resp.status_code == 400

    def test_the_api_reports_the_effective_tier(self, api, auth, lapsed_gold):
        body = auth(lapsed_gold).get("/api/auth/me/").json()
        assert body["subscriptionTier"] == "basic"
        assert body["subscriptionIsActive"] is False


class TestExpireSubscriptionsCommand:
    def test_it_downgrades_lapsed_members(self, lapsed_gold):
        call_command("expire_subscriptions")
        lapsed_gold.refresh_from_db()
        assert lapsed_gold.subscription_tier == SubscriptionTier.BASIC
        assert lapsed_gold.subscription_renews_at is None

    def test_it_leaves_active_members_alone(self, gold_listener):
        call_command("expire_subscriptions")
        gold_listener.refresh_from_db()
        assert gold_listener.subscription_tier == SubscriptionTier.GOLD

    def test_dry_run_changes_nothing(self, lapsed_gold):
        call_command("expire_subscriptions", "--dry-run")
        lapsed_gold.refresh_from_db()
        assert lapsed_gold.subscription_tier == SubscriptionTier.GOLD

    def test_running_twice_is_safe(self, lapsed_gold):
        call_command("expire_subscriptions")
        call_command("expire_subscriptions")
        lapsed_gold.refresh_from_db()
        assert lapsed_gold.subscription_tier == SubscriptionTier.BASIC


class TestRenewal:
    def test_paying_again_restores_the_tier(self, api, auth, lapsed_gold):
        """The renewal the brief asks for: buy again, regain the privileges."""
        client = auth(lapsed_gold)
        checkout = client.post(
            "/api/subscriptions/checkout/",
            {"tier": "gold", "billingPeriod": 1}, format="json",
        ).json()
        client.post(
            "/api/subscriptions/verify/",
            {"authority": checkout["authority"], "status": "OK"}, format="json",
        )
        lapsed_gold.refresh_from_db()
        assert lapsed_gold.current_tier == SubscriptionTier.GOLD
        assert lapsed_gold.subscription_is_active is True
