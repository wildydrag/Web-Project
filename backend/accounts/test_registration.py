"""Registration edge cases.

A teammate reported that creating an account was "impossible". The API turned
out to be fine — the frontend reported every failure as a duplicate email — but
these tests pin down the real behaviour so the contract is unambiguous: what
succeeds, what fails, and with which message.
"""

import pytest

from accounts.models import User, UserPreferences
from common.constants import ArtistStatus, Role, SubscriptionTier

pytestmark = pytest.mark.django_db


def _payload(**over):
    base = {
        "email": "newcomer@nava.app",
        "password": "secret123",
        "displayName": "کاربر تازه",
        "gender": "male",
        "birthDate": "2003-05-11",
    }
    base.update(over)
    return base


class TestListenerRegistration:
    def test_a_realistic_signup_succeeds(self, api):
        """The exact shape the sign-up form posts."""
        resp = api.post("/api/auth/register/", _payload(
            email="emad.changizi44@gmail.com", displayName="wildydrag",
        ), format="json")
        assert resp.status_code == 201
        body = resp.json()
        assert body["access"] and body["refresh"]
        assert body["user"]["email"] == "emad.changizi44@gmail.com"
        assert body["user"]["role"] == "listener"
        assert body["user"]["subscriptionTier"] == "basic"

    def test_the_new_account_can_immediately_sign_in(self, api):
        api.post("/api/auth/register/", _payload(), format="json")
        resp = api.post("/api/auth/login/", {
            "email": "newcomer@nava.app", "password": "secret123",
        }, format="json")
        assert resp.status_code == 200
        assert resp.json()["user"]["email"] == "newcomer@nava.app"

    def test_preferences_are_created_so_settings_sync_works(self, api):
        api.post("/api/auth/register/", _payload(), format="json")
        user = User.objects.get(email="newcomer@nava.app")
        assert UserPreferences.objects.filter(user=user).exists()

    def test_optional_fields_may_be_omitted(self, api):
        resp = api.post("/api/auth/register/", {
            "email": "minimal@nava.app", "password": "secret123", "displayName": "کم",
        }, format="json")
        assert resp.status_code == 201

    def test_a_username_is_generated(self, api):
        resp = api.post("/api/auth/register/", _payload(), format="json")
        assert resp.json()["user"]["username"].startswith("@nava_")


class TestRegistrationRejections:
    """Every rejection must carry a message the UI can show verbatim."""

    def _first_error(self, resp):
        body = resp.json()
        errors = body.get("errors") or {}
        for value in errors.values():
            return value[0] if isinstance(value, list) else value
        return body.get("detail")

    def test_duplicate_email_is_rejected_with_a_reason(self, api, listener):
        resp = api.post("/api/auth/register/", _payload(email=listener.email), format="json")
        assert resp.status_code == 400
        assert "قبلاً ثبت شده" in self._first_error(resp)

    def test_duplicate_email_is_case_insensitive(self, api, listener):
        resp = api.post("/api/auth/register/",
                        _payload(email=listener.email.upper()), format="json")
        assert resp.status_code == 400

    def test_short_password_is_rejected(self, api):
        resp = api.post("/api/auth/register/", _payload(password="12345"), format="json")
        assert resp.status_code == 400
        assert self._first_error(resp)

    def test_malformed_email_is_rejected(self, api):
        resp = api.post("/api/auth/register/", _payload(email="not-an-email"), format="json")
        assert resp.status_code == 400

    def test_missing_display_name_is_rejected(self, api):
        payload = _payload()
        del payload["displayName"]
        assert api.post("/api/auth/register/", payload, format="json").status_code == 400

    def test_invalid_birth_date_is_rejected(self, api):
        resp = api.post("/api/auth/register/", _payload(birthDate="11/05/2003"), format="json")
        assert resp.status_code == 400

    def test_a_rejected_signup_creates_nothing(self, api, listener):
        before = User.objects.count()
        api.post("/api/auth/register/", _payload(email=listener.email), format="json")
        assert User.objects.count() == before


class TestArtistRegistration:
    def test_artist_signup_creates_a_pending_profile(self, api):
        resp = api.post("/api/auth/register-artist/", {
            "name": "هنرمند تازه", "email": "fresh-artist@nava.app",
            "password": "secret123", "portfolio": "https://example.com/demo",
        }, format="json")
        assert resp.status_code == 201
        user = User.objects.get(email="fresh-artist@nava.app")
        assert user.role == Role.ARTIST
        assert user.artist.status == ArtistStatus.PENDING
        assert user.artist.verified is False

    def test_a_pending_artist_starts_on_the_basic_tier(self, api):
        api.post("/api/auth/register-artist/", {
            "name": "هنرمند", "email": "tier-artist@nava.app", "password": "secret123",
        }, format="json")
        user = User.objects.get(email="tier-artist@nava.app")
        assert user.current_tier == SubscriptionTier.BASIC

    def test_artist_signup_rejects_a_duplicate_email(self, api, listener):
        resp = api.post("/api/auth/register-artist/", {
            "name": "تکراری", "email": listener.email, "password": "secret123",
        }, format="json")
        assert resp.status_code == 400
