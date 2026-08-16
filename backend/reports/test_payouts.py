"""Artist payouts computed from the stream log.

The auditing table must show, for the period, the real unique-listener and
stream counts plus the reward owed — not a stored estimate.
"""

import datetime

import pytest
from django.core.management import call_command
from django.utils import timezone

from catalog.models import Song, SongArtist
from common.constants import Genre, PayoutStatus
from reports.models import Payout, StreamEvent
from reports.services import (
    artist_metrics,
    period_bounds,
    recalculate_payouts,
    reward_for,
)
from subscriptions.models import PlatformSettings

pytestmark = pytest.mark.django_db


def _song(artist, title="آهنگ"):
    song = Song.objects.create(
        title=title, genre=Genre.POP, duration_sec=180,
        release_date=datetime.date.today(),
    )
    SongArtist.objects.create(song=song, artist=artist, position=0)
    return song


def _current_period():
    return timezone.localdate().strftime("%Y-%m")


class TestPeriodBounds:
    def test_a_normal_month(self):
        start, end = period_bounds("2026-07")
        assert (start.year, start.month, start.day) == (2026, 7, 1)
        assert (end.year, end.month, end.day) == (2026, 8, 1)

    def test_december_rolls_into_the_next_year(self):
        start, end = period_bounds("2026-12")
        assert (start.year, start.month) == (2026, 12)
        assert (end.year, end.month) == (2027, 1)


class TestRewardFormula:
    def test_rewards_both_volume_and_reach(self):
        settings = PlatformSettings.load()
        expected = 100 * settings.payout_per_stream + 10 * settings.payout_per_listener
        assert reward_for(100, 10) == expected

    def test_no_listening_earns_nothing(self):
        assert reward_for(0, 0) == 0

    def test_wider_reach_pays_more_for_the_same_plays(self):
        """Two artists with equal streams: the one heard by more people earns more."""
        assert reward_for(100, 50) > reward_for(100, 5)

    def test_rates_are_admin_tunable_without_code_change(self):
        settings = PlatformSettings.load()
        settings.payout_per_stream = 5
        settings.payout_per_listener = 100
        settings.save()
        assert reward_for(10, 2) == 10 * 5 + 2 * 100


class TestArtistMetrics:
    def test_counts_streams_and_distinct_listeners(self, approved_artist, make_user):
        _user, artist = approved_artist
        song = _song(artist)
        fan_a = make_user("fan-a@test.app")
        fan_b = make_user("fan-b@test.app")
        # fan_a plays three times, fan_b once -> 4 streams, 2 unique listeners.
        for _ in range(3):
            StreamEvent.objects.create(user=fan_a, song=song)
        StreamEvent.objects.create(user=fan_b, song=song)

        start, end = period_bounds(_current_period())
        metrics = artist_metrics(artist, start, end)
        assert metrics["total_streams"] == 4
        assert metrics["unique_listeners"] == 2

    def test_ignores_plays_outside_the_period(self, approved_artist, listener):
        _user, artist = approved_artist
        song = _song(artist)
        event = StreamEvent.objects.create(user=listener, song=song)
        # Push the play back a year.
        StreamEvent.objects.filter(pk=event.pk).update(
            created_at=timezone.now() - datetime.timedelta(days=365)
        )
        start, end = period_bounds(_current_period())
        assert artist_metrics(artist, start, end)["total_streams"] == 0

    def test_ignores_other_artists(self, approved_artist, make_user, listener):
        from accounts.models import Artist
        from common.constants import ArtistStatus, Role, SubscriptionTier
        _user, artist = approved_artist
        other_owner = make_user("other@test.app", role=Role.ARTIST, tier=SubscriptionTier.GOLD)
        other = Artist.objects.create(
            user=other_owner, name="دیگری", status=ArtistStatus.APPROVED, verified=True
        )
        StreamEvent.objects.create(user=listener, song=_song(other))

        start, end = period_bounds(_current_period())
        assert artist_metrics(artist, start, end)["total_streams"] == 0


class TestRecalculatePayouts:
    def test_builds_a_row_per_approved_artist(self, approved_artist, listener):
        _user, artist = approved_artist
        StreamEvent.objects.create(user=listener, song=_song(artist))

        rows = recalculate_payouts(_current_period())
        assert len(rows) == 1
        payout = rows[0]
        assert payout.artist_id == artist.id
        assert payout.total_streams == 1
        assert payout.unique_listeners == 1
        assert payout.reward_toman == reward_for(1, 1)

    def test_is_idempotent(self, approved_artist, listener):
        _user, artist = approved_artist
        StreamEvent.objects.create(user=listener, song=_song(artist))
        period = _current_period()
        recalculate_payouts(period)
        recalculate_payouts(period)
        assert Payout.objects.filter(artist=artist, period=period).count() == 1

    def test_recalculating_never_un_pays_a_settled_artist(self, approved_artist, listener):
        _user, artist = approved_artist
        StreamEvent.objects.create(user=listener, song=_song(artist))
        period = _current_period()
        payout = recalculate_payouts(period)[0]
        payout.status = PayoutStatus.SETTLED
        payout.save()

        recalculate_payouts(period)
        payout.refresh_from_db()
        assert payout.status == PayoutStatus.SETTLED

    def test_management_command_runs(self, approved_artist, listener):
        _user, artist = approved_artist
        StreamEvent.objects.create(user=listener, song=_song(artist))
        call_command("recalculate_payouts", _current_period())
        assert Payout.objects.filter(artist=artist).exists()


class TestAuditingEndpointUsesRealFigures:
    def test_admin_sees_the_recalculated_row(self, api, auth, admin, approved_artist, listener):
        _user, artist = approved_artist
        song = _song(artist)
        for _ in range(5):
            StreamEvent.objects.create(user=listener, song=song)
        period = _current_period()
        recalculate_payouts(period)

        rows = auth(admin).get(f"/api/dashboard/audits/?period={period}").json()["results"]
        row = next(r for r in rows if r["artistId"] == artist.id)
        assert row["totalStreams"] == 5
        assert row["uniqueListeners"] == 1
        assert row["rewardToman"] == reward_for(5, 1)
        assert row["artistName"] == artist.name
