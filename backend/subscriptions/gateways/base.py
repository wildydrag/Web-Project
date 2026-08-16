"""Payment gateway abstraction (Strategy pattern).

A concrete gateway turns an amount into a redirect the user follows, then
confirms the result on the callback. Swapping providers (fake ⇄ Zarinpal) is a
settings change, never a code change in the views/services.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass


class PaymentGatewayError(Exception):
    """The gateway could not be reached, or refused the request.

    Raised instead of letting a ``requests`` exception or a stray ``KeyError``
    escape, so the API can answer with a clear 502 rather than a 500 traceback.
    """

    def __init__(self, message: str, *, code: int | None = None):
        super().__init__(message)
        self.message = message
        self.code = code


@dataclass
class PaymentRequestResult:
    authority: str      # gateway-side token identifying this transaction
    redirect_url: str   # where to send the user's browser to pay


@dataclass
class PaymentVerifyResult:
    success: bool
    ref_id: str = ""    # settlement reference on success
    code: int | None = None
    message: str = ""


class PaymentGateway(ABC):
    name = "base"

    @abstractmethod
    def request_payment(self, *, amount: int, description: str,
                        callback_url: str) -> PaymentRequestResult:
        ...

    @abstractmethod
    def verify_payment(self, *, authority: str, amount: int) -> PaymentVerifyResult:
        ...
