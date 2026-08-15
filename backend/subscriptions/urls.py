from django.urls import path

from .views import CheckoutView, PlansView, PlatformSettingsView, VerifyView

urlpatterns = [
    path("subscriptions/plans/", PlansView.as_view(), name="plans"),
    path("subscriptions/checkout/", CheckoutView.as_view(), name="checkout"),
    path("subscriptions/verify/", VerifyView.as_view(), name="verify"),
    path("platform-settings/", PlatformSettingsView.as_view(), name="platform-settings"),
]
