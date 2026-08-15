"""ZarinPal gateway (sandbox by default).

The flow has three steps, and only the middle one leaves our control:

1. ``request_payment`` posts the amount to ZarinPal and gets back an
   *authority* — the token that identifies this transaction.
2. The browser is sent to ``StartPay/<authority>``, where the user pays. On the
   sandbox there is no real card: the page offers a "pay"/"cancel" choice.
3. ZarinPal redirects back to our callback with ``Authority`` and ``Status``
   query parameters, and ``verify_payment`` confirms the result. Nothing is
   activated until this step succeeds — a browser landing on the callback URL
   proves nothing on its own.

Prices are stored in Toman and ZarinPal settles in Rial, so amounts are ×10 on
the wire and only on the wire.

The sandbox does not authenticate merchants: any well-formed UUID works as a
``merchant_id``, which is why ``ZARINPAL_MERCHANT_ID`` has a usable default.
"""

import requests
from django.conf import settings

from .base import (
    PaymentGateway,
    PaymentGatewayError,
    PaymentRequestResult,
    PaymentVerifyResult,
)

#: ZarinPal returns 100 for a fresh verification and 101 for one that was
#: already verified. Both mean the money arrived, so both count as success.
VERIFIED = 100
ALREADY_VERIFIED = 101

TIMEOUT = 15


class ZarinpalGateway(PaymentGateway):
    name = "zarinpal"

    SANDBOX = "https://sandbox.zarinpal.com/pg"
    LIVE = "https://payment.zarinpal.com/pg"

    @property
    def base(self) -> str:
        return self.SANDBOX if settings.ZARINPAL_SANDBOX else self.LIVE

    def _post(self, endpoint: str, payload: dict) -> dict:
        """POST to ZarinPal and return the parsed body, or raise."""
        try:
            resp = requests.post(
                f"{self.base}/v4/payment/{endpoint}",
                json={"merchant_id": settings.ZARINPAL_MERCHANT_ID, **payload},
                headers={"Accept": "application/json"},
                timeout=TIMEOUT,
            )
            body = resp.json()
        except requests.RequestException as exc:
            raise PaymentGatewayError(f"درگاه پرداخت در دسترس نیست: {exc}") from exc
        except ValueError as exc:  # not JSON — an outage page, usually
            raise PaymentGatewayError("پاسخ نامعتبر از درگاه پرداخت.") from exc

        # On success `errors` is an empty list; on failure it is an object
        # carrying a negative code and a message.
        errors = body.get("errors")
        if isinstance(errors, dict) and errors:
            raise PaymentGatewayError(
                errors.get("message", "خطای نامشخص درگاه پرداخت."),
                code=errors.get("code"),
            )
        return body.get("data") or {}

    def request_payment(self, *, amount, description, callback_url):
        data = self._post("request.json", {
            "amount": amount * 10,          # Toman → Rial
            "callback_url": callback_url,
            "description": description,
        })
        authority = data.get("authority") or ""
        if not authority:
            raise PaymentGatewayError("درگاه پرداخت شناسه تراکنش برنگرداند.")
        return PaymentRequestResult(
            authority=authority,
            redirect_url=f"{self.base}/StartPay/{authority}",
        )

    def verify_payment(self, *, authority, amount):
        try:
            data = self._post("verify.json", {
                "amount": amount * 10,
                "authority": authority,
            })
        except PaymentGatewayError as exc:
            # A refused verification is a normal outcome (the user cancelled,
            # or the session expired), not a server fault — report it as a
            # failed payment and let the caller mark the record accordingly.
            return PaymentVerifyResult(
                success=False, code=exc.code, message=exc.message
            )

        code = data.get("code")
        return PaymentVerifyResult(
            success=code in (VERIFIED, ALREADY_VERIFIED),
            ref_id=str(data.get("ref_id") or ""),
            code=code,
            message=str(data.get("message") or ""),
        )
