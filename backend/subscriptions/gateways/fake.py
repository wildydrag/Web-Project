"""Offline, deterministic gateway for local dev, Docker, and tests.

Never touches the network. An authority containing ``fail`` verifies as failed,
so both success and failure paths are testable without a real provider.
"""

import secrets

from .base import PaymentGateway, PaymentRequestResult, PaymentVerifyResult


class FakeGateway(PaymentGateway):
    name = "fake"

    def request_payment(self, *, amount, description, callback_url):
        authority = f"FAKE-{secrets.token_hex(8)}"
        separator = "&" if "?" in callback_url else "?"
        redirect = f"{callback_url}{separator}Authority={authority}&Status=OK"
        return PaymentRequestResult(authority=authority, redirect_url=redirect)

    def verify_payment(self, *, authority, amount):
        success = "fail" not in authority.lower()
        return PaymentVerifyResult(
            success=success, ref_id=f"REF-{secrets.token_hex(6)}" if success else ""
        )
