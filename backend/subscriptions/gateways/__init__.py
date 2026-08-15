"""Gateway selection — the factory reads ``settings.PAYMENT_GATEWAY``."""

from django.conf import settings

from .base import PaymentGateway, PaymentRequestResult, PaymentVerifyResult
from .fake import FakeGateway
from .zarinpal import ZarinpalGateway

_GATEWAYS = {FakeGateway.name: FakeGateway, ZarinpalGateway.name: ZarinpalGateway}


def get_gateway() -> PaymentGateway:
    return _GATEWAYS.get(settings.PAYMENT_GATEWAY, FakeGateway)()


__all__ = [
    "get_gateway",
    "PaymentGateway",
    "PaymentRequestResult",
    "PaymentVerifyResult",
]
