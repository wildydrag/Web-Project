"""Unit tests for billing maths and the payment gateway.

Deliberately free of the database and the HTTP layer: these call the functions
directly, so a failure points at one function rather than a whole request path.
"""

import datetime

import pytest
from django.utils import timezone

from subscriptions.gateways import get_gateway
from subscriptions.gateways.fake import FakeGateway
from subscriptions.services import _add_months


def _dt(year, month, day):
    return timezone.make_aware(datetime.datetime(year, month, day, 12, 0))


class TestAddMonths:
    """Billing-period maths. Month-end dates are the classic source of bugs."""

    def test_simple_advance(self):
        assert _add_months(_dt(2026, 3, 15), 1).date() == datetime.date(2026, 4, 15)

    @pytest.mark.parametrize("months,expected", [
        (1, datetime.date(2026, 8, 30)),
        (3, datetime.date(2026, 10, 30)),
        (6, datetime.date(2027, 1, 30)),
        (12, datetime.date(2027, 7, 30)),
    ])
    def test_every_supported_billing_period(self, months, expected):
        """The brief offers 1, 3, 6 and 12-month subscriptions."""
        assert _add_months(_dt(2026, 7, 30), months).date() == expected

    def test_clamps_to_the_last_day_of_a_shorter_month(self):
        # 31 January + 1 month has no 31st to land on.
        assert _add_months(_dt(2026, 1, 31), 1).date() == datetime.date(2026, 2, 28)

    def test_respects_leap_years(self):
        assert _add_months(_dt(2028, 1, 31), 1).date() == datetime.date(2028, 2, 29)

    def test_rolls_over_the_year_boundary(self):
        assert _add_months(_dt(2026, 12, 15), 1).date() == datetime.date(2027, 1, 15)

    def test_twelve_months_from_december_lands_next_december(self):
        assert _add_months(_dt(2026, 12, 31), 12).date() == datetime.date(2027, 12, 31)

    def test_preserves_the_time_of_day(self):
        start = _dt(2026, 5, 10)
        assert _add_months(start, 2).timetz() == start.timetz()


class TestFakeGateway:
    """The offline gateway used by tests and by Docker without internet access."""

    def setup_method(self):
        self.gateway = FakeGateway()

    def test_request_returns_an_authority_and_a_redirect(self):
        result = self.gateway.request_payment(
            amount=79000, description="test", callback_url="http://x.test/cb"
        )
        assert result.authority.startswith("FAKE-")
        assert "Authority=" in result.redirect_url
        assert result.redirect_url.startswith("http://x.test/cb")

    def test_appends_correctly_when_the_callback_already_has_a_query(self):
        result = self.gateway.request_payment(
            amount=1, description="d", callback_url="http://x.test/cb?a=1"
        )
        assert "?a=1&Authority=" in result.redirect_url

    def test_each_request_gets_a_unique_authority(self):
        authorities = {
            self.gateway.request_payment(
                amount=1, description="d", callback_url="http://x.test/cb"
            ).authority
            for _ in range(20)
        }
        assert len(authorities) == 20

    def test_verification_succeeds_and_returns_a_reference(self):
        result = self.gateway.verify_payment(authority="FAKE-abc", amount=79000)
        assert result.success is True
        assert result.ref_id

    def test_an_authority_marked_fail_verifies_as_failed(self):
        """Lets the failure path be exercised deterministically in tests."""
        result = self.gateway.verify_payment(authority="FAKE-please-fail", amount=79000)
        assert result.success is False
        assert result.ref_id == ""


class TestGatewayFactory:
    """Swapping providers must be a settings change, never a code change."""

    def test_defaults_to_the_offline_gateway(self, settings):
        settings.PAYMENT_GATEWAY = "fake"
        assert isinstance(get_gateway(), FakeGateway)

    def test_selects_zarinpal_when_configured(self, settings):
        from subscriptions.gateways.zarinpal import ZarinpalGateway
        settings.PAYMENT_GATEWAY = "zarinpal"
        assert isinstance(get_gateway(), ZarinpalGateway)

    def test_falls_back_safely_for_an_unknown_name(self, settings):
        settings.PAYMENT_GATEWAY = "not-a-real-gateway"
        assert isinstance(get_gateway(), FakeGateway)
