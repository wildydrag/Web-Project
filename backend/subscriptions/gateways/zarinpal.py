"""Zarinpal sandbox gateway.

Prices are stored in Toman; Zarinpal expects Rial, so amounts are ×10 on the
wire. Used when ``PAYMENT_GATEWAY=zarinpal``; the fake gateway is the default so
tests/Docker work offline.
"""

import requests
from django.conf import settings

from .base import PaymentGateway, PaymentRequestResult, PaymentVerifyResult


class ZarinpalGateway(PaymentGateway):
    name = "zarinpal"
    API = "https://sandbox.zarinpal.com/pg/v4/payment"
    START = "https://sandbox.zarinpal.com/pg/StartPay"

    def request_payment(self, *, amount, description, callback_url):
        resp = requests.post(
            f"{self.API}/request.json",
            json={
                "merchant_id": settings.ZARINPAL_MERCHANT_ID,
                "amount": amount * 10,
                "callback_url": callback_url,
                "description": description,
            },
            timeout=10,
        )
        data = resp.json().get("data") or {}
        authority = data.get("authority", "")
        return PaymentRequestResult(
            authority=authority, redirect_url=f"{self.START}/{authority}"
        )

    def verify_payment(self, *, authority, amount):
        resp = requests.post(
            f"{self.API}/verify.json",
            json={
                "merchant_id": settings.ZARINPAL_MERCHANT_ID,
                "amount": amount * 10,
                "authority": authority,
            },
            timeout=10,
        )
        data = resp.json().get("data") or {}
        return PaymentVerifyResult(
            success=data.get("code") in (100, 101),
            ref_id=str(data.get("ref_id", "")),
        )
