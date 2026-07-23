"""Payment gateway abstraction (Strategy pattern).

A concrete gateway turns an amount into a redirect the user follows, then
confirms the result on the callback. Swapping providers (fake ⇄ Zarinpal) is a
settings change, never a code change in the views/services.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class PaymentRequestResult:
    authority: str      # gateway-side token identifying this transaction
    redirect_url: str   # where to send the user's browser to pay


@dataclass
class PaymentVerifyResult:
    success: bool
    ref_id: str = ""    # settlement reference on success


class PaymentGateway(ABC):
    name = "base"

    @abstractmethod
    def request_payment(self, *, amount: int, description: str,
                        callback_url: str) -> PaymentRequestResult:
        ...

    @abstractmethod
    def verify_payment(self, *, authority: str, amount: int) -> PaymentVerifyResult:
        ...
