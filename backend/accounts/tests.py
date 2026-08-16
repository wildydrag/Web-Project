"""Auth & account tests: registration, login, JWT, permissions, profile edits."""

from io import BytesIO

import pytest
from PIL import Image

from accounts.models import User
from common.constants import ArtistStatus, Role
from engagement.models import Notification

pytestmark = pytest.mark.django_db


def _png():
    from django.core.files.uploadedfile import SimpleUploadedFile
    buf = BytesIO()
    Image.new("RGB", (2, 2), "purple").save(buf, format="PNG")
    return SimpleUploadedFile("a.png", buf.getvalue(), content_type="image/png")


def test_register_listener_returns_tokens_and_user(api):
    resp = api.post(
        "/api/auth/register/",
        {"email": "new@nava.app", "password": "secret123", "displayName": "کاربر نو"},
        format="json",
    )
    assert resp.status_code == 201
    body = resp.json()  # wire format — camelCase, what the frontend consumes
    assert body["access"] and body["refresh"]
    user = body["user"]
    assert user["email"] == "new@nava.app"
    assert user["role"] == "listener"
    assert user["subscriptionTier"] == "basic"
    assert user["username"].startswith("@nava_")


def test_register_duplicate_email_rejected(api, listener):
    resp = api.post(
        "/api/auth/register/",
        {"email": listener.email, "password": "secret123", "displayName": "x"},
        format="json",
    )
    assert resp.status_code == 400


def test_register_short_password_rejected(api):
    resp = api.post(
        "/api/auth/register/",
        {"email": "a@nava.app", "password": "12", "displayName": "x"},
        format="json",
    )
    assert resp.status_code == 400


def test_register_artist_creates_pending_profile_and_notifies_staff(api, support, admin):
    resp = api.post(
        "/api/auth/register-artist/",
        {"name": "هنرمند جدید", "email": "art@nava.app", "password": "secret123",
         "portfolio": "https://example.com/x"},
        format="json",
    )
    assert resp.status_code == 201
    user = User.objects.get(email="art@nava.app")
    assert user.role == Role.ARTIST
    assert user.artist.status == ArtistStatus.PENDING
    # both staff accounts receive a new-artist-request notification
    assert Notification.objects.filter(kind="new_artist_request").count() == 2


def test_login_returns_user_payload(api, listener):
    resp = api.post(
        "/api/auth/login/",
        {"email": listener.email, "password": "nava1234"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["user"]["id"] == listener.id


def test_login_wrong_password_rejected(api, listener):
    resp = api.post(
        "/api/auth/login/",
        {"email": listener.email, "password": "wrong-password"},
        format="json",
    )
    assert resp.status_code == 401


def test_jwt_access_token_authenticates(api, listener):
    login = api.post(
        "/api/auth/login/",
        {"email": listener.email, "password": "nava1234"},
        format="json",
    )
    api.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
    resp = api.get("/api/auth/me/")
    assert resp.status_code == 200
    assert resp.data["email"] == listener.email


def test_me_requires_authentication(api):
    assert api.get("/api/auth/me/").status_code == 401


def test_me_patch_updates_profile(api, auth, gold_listener):
    client = auth(gold_listener)
    resp = client.patch("/api/auth/me/", {"displayName": "نام تازه"}, format="json")
    assert resp.status_code == 200
    assert resp.json()["displayName"] == "نام تازه"


def test_basic_tier_cannot_upload_avatar(api, auth, listener):
    client = auth(listener)  # basic tier
    resp = client.patch("/api/auth/me/", {"avatar": _png()}, format="multipart")
    assert resp.status_code == 400


def test_gold_tier_can_upload_avatar(api, auth, gold_listener):
    client = auth(gold_listener)
    resp = client.patch("/api/auth/me/", {"avatar": _png()}, format="multipart")
    assert resp.status_code == 200
    assert resp.json()["avatarUrl"]


def test_toggle_follow_updates_state_and_count(api, auth, listener, approved_artist):
    _user, artist = approved_artist
    client = auth(listener)
    on = client.post("/api/auth/me/toggle-follow/", {"artistId": artist.id}, format="json")
    assert on.json()["following"] is True
    assert artist.id in client.get("/api/auth/me/").json()["followingIds"]
    off = client.post("/api/auth/me/toggle-follow/", {"artistId": artist.id}, format="json")
    assert off.json()["following"] is False
    assert artist.id not in client.get("/api/auth/me/").json()["followingIds"]
