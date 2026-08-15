"""Shared pytest fixtures for the Nava backend test-suite."""

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Artist, User, UserPreferences
from common.constants import ArtistStatus, Role, SubscriptionTier


@pytest.fixture(autouse=True)
def _isolated_media(settings, tmp_path):
    """Keep uploaded files from tests out of the repo's media/ dir."""
    settings.MEDIA_ROOT = tmp_path / "media"


@pytest.fixture(autouse=True)
def _offline_gateway(settings):
    """Force the fake gateway for every test.

    The application defaults to ZarinPal's sandbox; the suite must not depend on
    that (or on any network) to pass. Tests that exercise the ZarinPal adapter
    itself opt back in and stub the HTTP call.
    """
    settings.PAYMENT_GATEWAY = "fake"


@pytest.fixture
def api():
    return APIClient()


def _make_user(email, role=Role.LISTENER, tier=SubscriptionTier.BASIC, **extra):
    # A paid tier is only in force while it has a future renewal date, so give
    # fixtures one by default. Tests that need a lapsed plan pass it explicitly.
    if tier != SubscriptionTier.BASIC and "subscription_renews_at" not in extra:
        extra["subscription_renews_at"] = timezone.now() + timedelta(days=30)
    user = User.objects.create_user(
        email=email, password="nava1234", role=role,
        display_name=extra.pop("display_name", email.split("@")[0]),
        subscription_tier=tier, **extra,
    )
    UserPreferences.objects.create(user=user)
    return user


@pytest.fixture
def make_user(db):
    return _make_user


@pytest.fixture
def listener(db):
    return _make_user("listener@nava.app")


@pytest.fixture
def gold_listener(db):
    return _make_user("gold@test.app", tier=SubscriptionTier.GOLD)


@pytest.fixture
def approved_artist(db):
    user = _make_user("artist@test.app", role=Role.ARTIST, tier=SubscriptionTier.GOLD)
    artist = Artist.objects.create(
        user=user, name="هنرمند تست", status=ArtistStatus.APPROVED, verified=True
    )
    return user, artist


@pytest.fixture
def support(db):
    return _make_user("support@test.app", role=Role.SUPPORT)


@pytest.fixture
def admin(db):
    return _make_user("admin@test.app", role=Role.ADMIN)


@pytest.fixture
def catalog(db, approved_artist):
    """A tiny catalog: one public single and one gold-only early-access single."""
    import datetime

    from catalog.models import Song, SongArtist
    from common.constants import Genre

    _user, artist = approved_artist
    today = datetime.date.today()
    artist.follower_count = 1000
    artist.monthly_listeners = 5000
    artist.total_streams = 90000
    artist.save()

    normal = Song.objects.create(
        title="آهنگ عادی", genre=Genre.POP, duration_sec=200, release_date=today,
        early_access=False, stream_count=1000, listener_count=300,
    )
    SongArtist.objects.create(song=normal, artist=artist, position=0)

    early = Song.objects.create(
        title="زودهنگام", genre=Genre.POP, duration_sec=180,
        release_date=today + datetime.timedelta(days=30), early_access=True,
    )
    SongArtist.objects.create(song=early, artist=artist, position=0)
    return {"artist": artist, "normal": normal, "early": early}


@pytest.fixture
def auth(api):
    """Return a helper that authenticates the APIClient as a given user."""
    def _auth(user):
        api.force_authenticate(user=user)
        return api
    return _auth
