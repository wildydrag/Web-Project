from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    LoginView,
    MeView,
    RegisterArtistView,
    RegisterListenerView,
    ToggleFollowView,
)

urlpatterns = [
    path("auth/register/", RegisterListenerView.as_view(), name="register"),
    path("auth/register-artist/", RegisterArtistView.as_view(), name="register-artist"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("auth/me/toggle-follow/", ToggleFollowView.as_view(), name="toggle-follow"),
]
