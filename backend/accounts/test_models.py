"""Unit tests for account model behaviour (role helpers, generated fields).

The auth endpoints are covered in ``tests.py``; these pin down the model layer
on its own.
"""

import pytest

from accounts.models import Artist, User
from common.constants import ArtistStatus, Role

pytestmark = pytest.mark.django_db


def _user(**kwargs):
    kwargs.setdefault("email", "unit@test.app")
    kwargs.setdefault("display_name", "کاربر")
    return User.objects.create_user(password="nava1234", **kwargs)


class TestRoleHelpers:
    """`is_platform_staff` is the dashboard audience — distinct from Django's
    `is_staff`, which controls the admin site."""

    @pytest.mark.parametrize("role,expected", [
        (Role.LISTENER, False),
        (Role.ARTIST, False),
        (Role.SUPPORT, True),
        (Role.ADMIN, True),
    ])
    def test_is_platform_staff(self, role, expected):
        assert _user(email=f"{role}@test.app", role=role).is_platform_staff is expected

    @pytest.mark.parametrize("role,expected", [
        (Role.LISTENER, False),
        (Role.SUPPORT, False),
        (Role.ADMIN, True),
    ])
    def test_is_admin(self, role, expected):
        assert _user(email=f"a-{role}@test.app", role=role).is_admin is expected

    def test_admin_is_a_superset_of_support(self):
        admin = _user(email="super@test.app", role=Role.ADMIN)
        assert admin.is_admin and admin.is_platform_staff


class TestGeneratedFields:
    def test_username_is_assigned_automatically(self):
        user = _user()
        assert user.username.startswith("@nava_")

    def test_usernames_do_not_collide(self):
        names = {_user(email=f"u{i}@test.app").username for i in range(25)}
        assert len(names) == 25

    def test_an_explicit_username_is_kept(self):
        """The seed relies on this to reproduce the Phase 1 handles."""
        assert _user(username="@nava_1042").username == "@nava_1042"

    def test_avatar_seed_defaults_to_the_display_name(self):
        assert _user(display_name="سارا").avatar_seed == "سارا"

    def test_avatar_seed_falls_back_to_the_email(self):
        user = _user(display_name="", email="fallback@test.app")
        assert user.avatar_seed == "fallback@test.app"

    def test_id_uses_the_user_prefix(self):
        assert _user().id.startswith("us_")


class TestUserManager:
    def test_email_is_normalised(self):
        assert _user(email="Mixed@Test.App").email == "Mixed@test.app"

    def test_password_is_hashed_not_stored_in_plain_text(self):
        user = _user()
        assert user.password != "nava1234"
        assert user.check_password("nava1234")

    def test_creating_a_user_without_an_email_is_rejected(self):
        with pytest.raises(ValueError):
            User.objects.create_user(email="", password="nava1234", display_name="x")

    def test_superuser_gets_admin_role_and_flags(self):
        boss = User.objects.create_superuser(
            email="boss@test.app", password="nava1234", display_name="Boss"
        )
        assert boss.role == Role.ADMIN
        assert boss.is_staff and boss.is_superuser


class TestArtistProfile:
    def test_is_approved_reflects_status(self):
        owner = _user(email="artist-unit@test.app", role=Role.ARTIST)
        artist = Artist.objects.create(user=owner, name="هنرمند", status=ArtistStatus.PENDING)
        assert artist.is_approved is False

        artist.status = ArtistStatus.APPROVED
        assert artist.is_approved is True

    def test_artist_id_uses_its_own_prefix(self):
        owner = _user(email="prefix-artist@test.app", role=Role.ARTIST)
        artist = Artist.objects.create(user=owner, name="هنرمند")
        assert artist.id.startswith("ar_")
