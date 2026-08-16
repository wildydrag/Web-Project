"""Tests for the ZarinPal adapter.

Every HTTP call is stubbed, so the suite never touches the network: what is
being checked is that we send what ZarinPal expects and read its replies
correctly, not that ZarinPal is up.

The response bodies below are copied from real sandbox calls.
"""

import pytest
import requests

from subscriptions.gateways import get_gateway
from subscriptions.gateways.base import PaymentGatewayError
from subscriptions.gateways.zarinpal import ZarinpalGateway

pytestmark = pytest.mark.usefixtures("zarinpal")

AUTHORITY = "S000000000000000000000000000006dgjry"


@pytest.fixture
def zarinpal(settings):
    settings.PAYMENT_GATEWAY = "zarinpal"
    settings.ZARINPAL_SANDBOX = True
    settings.ZARINPAL_MERCHANT_ID = "b8f1e2c4-3a67-4d5b-9c81-2f4e6a0d7b39"


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload


@pytest.fixture
def capture(monkeypatch):
    """Record the outgoing request and reply with a canned body."""
    sent = {}

    def _install(payload):
        def fake_post(url, json=None, headers=None, timeout=None):
            sent["url"] = url
            sent["json"] = json
            return FakeResponse(payload)

        monkeypatch.setattr(requests, "post", fake_post)
        return sent

    return _install


class TestGatewaySelection:
    def test_the_factory_returns_zarinpal_when_configured(self):
        assert isinstance(get_gateway(), ZarinpalGateway)

    def test_sandbox_and_live_hit_different_hosts(self, settings):
        gateway = ZarinpalGateway()
        assert "sandbox" in gateway.base
        settings.ZARINPAL_SANDBOX = False
        assert "sandbox" not in ZarinpalGateway().base


class TestRequestPayment:
    OK = {
        "data": {"authority": AUTHORITY, "fee": 4500, "code": 100, "message": "Success"},
        "errors": [],
    }

    def test_returns_the_authority_and_start_url(self, capture):
        capture(self.OK)
        result = ZarinpalGateway().request_payment(
            amount=15_000, description="اشتراک gold",
            callback_url="http://localhost:3000/payment/callback",
        )
        assert result.authority == AUTHORITY
        assert result.redirect_url == (
            f"https://sandbox.zarinpal.com/pg/StartPay/{AUTHORITY}"
        )

    def test_toman_is_converted_to_rial(self, capture):
        sent = capture(self.OK)
        ZarinpalGateway().request_payment(
            amount=15_000, description="x", callback_url="http://cb",
        )
        # Prices are stored in Toman; ZarinPal settles in Rial.
        assert sent["json"]["amount"] == 150_000

    def test_the_merchant_id_and_callback_are_sent(self, capture):
        sent = capture(self.OK)
        ZarinpalGateway().request_payment(
            amount=1, description="d", callback_url="http://cb/x",
        )
        assert sent["json"]["merchant_id"] == "b8f1e2c4-3a67-4d5b-9c81-2f4e6a0d7b39"
        assert sent["json"]["callback_url"] == "http://cb/x"
        assert sent["json"]["description"] == "d"
        assert sent["url"].endswith("/pg/v4/payment/request.json")

    def test_a_gateway_error_is_raised_not_swallowed(self, capture):
        capture({
            "data": [],
            "errors": {"message": "Merchant id is invalid.", "code": -9},
        })
        with pytest.raises(PaymentGatewayError) as exc:
            ZarinpalGateway().request_payment(
                amount=1, description="d", callback_url="http://cb",
            )
        assert exc.value.code == -9

    def test_a_missing_authority_is_an_error(self, capture):
        capture({"data": {"code": 100}, "errors": []})
        with pytest.raises(PaymentGatewayError):
            ZarinpalGateway().request_payment(
                amount=1, description="d", callback_url="http://cb",
            )

    def test_a_network_failure_becomes_a_gateway_error(self, monkeypatch):
        def boom(*args, **kwargs):
            raise requests.ConnectionError("no route to host")

        monkeypatch.setattr(requests, "post", boom)
        with pytest.raises(PaymentGatewayError):
            ZarinpalGateway().request_payment(
                amount=1, description="d", callback_url="http://cb",
            )

    def test_a_non_json_body_becomes_a_gateway_error(self, monkeypatch):
        class Html:
            def json(self):
                raise ValueError("not json")

        monkeypatch.setattr(requests, "post", lambda *a, **k: Html())
        with pytest.raises(PaymentGatewayError):
            ZarinpalGateway().request_payment(
                amount=1, description="d", callback_url="http://cb",
            )


class TestVerifyPayment:
    def test_code_100_is_a_success(self, capture):
        capture({
            "data": {"code": 100, "ref_id": 987654321, "message": "Paid"},
            "errors": [],
        })
        result = ZarinpalGateway().verify_payment(authority=AUTHORITY, amount=15_000)
        assert result.success is True
        assert result.ref_id == "987654321"

    def test_code_101_already_verified_also_counts(self, capture):
        # ZarinPal answers 101 when the same transaction is verified twice.
        # The money still arrived, so a repeated callback must not fail.
        capture({"data": {"code": 101, "ref_id": 5}, "errors": []})
        assert ZarinpalGateway().verify_payment(
            authority=AUTHORITY, amount=1,
        ).success is True

    def test_an_unpaid_session_fails_without_raising(self, capture):
        # The real sandbox reply when the user never completed payment.
        capture({
            "data": {},
            "errors": {
                "message": "Session is not valid, session is not active paid try.",
                "code": -51,
            },
        })
        result = ZarinpalGateway().verify_payment(authority=AUTHORITY, amount=1)
        assert result.success is False
        assert result.code == -51
        assert result.ref_id == ""

    def test_verify_also_converts_to_rial(self, capture):
        sent = capture({"data": {"code": 100, "ref_id": 1}, "errors": []})
        ZarinpalGateway().verify_payment(authority=AUTHORITY, amount=9_000)
        assert sent["json"]["amount"] == 90_000
        assert sent["json"]["authority"] == AUTHORITY
        assert sent["url"].endswith("/pg/v4/payment/verify.json")
