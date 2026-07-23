"""Reporting tests: play/daily-cap and server-side aggregations."""

import datetime

import pytest

from catalog.models import Song, SongArtist
from common.constants import Genre, SubscriptionTier
from reports.models import Payout, StreamEvent

pytestmark = pytest.mark.django_db


def _song(artist=None, title="آهنگ", streams=0):
    song = Song.objects.create(
        title=title, genre=Genre.POP, duration_sec=100,
        release_date=datetime.date.today(), stream_count=streams,
    )
    if artist:
        SongArtist.objects.create(song=song, artist=artist, position=0)
    return song


def test_play_records_stream_and_reports_remaining(api, auth, listener):
    song = _song()
    resp = auth(listener).post(f"/api/songs/{song.id}/play/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["dailyStreams"] == 1
    assert body["remaining"] == 59  # basic cap 60
    assert StreamEvent.objects.filter(user=listener, song=song).count() == 1
    song.refresh_from_db()
    assert song.stream_count == 1


def test_basic_daily_cap_blocks_after_limit(api, auth, listener):
    song = _song()
    for _ in range(60):
        StreamEvent.objects.create(user=listener, song=song)
    resp = auth(listener).post(f"/api/songs/{song.id}/play/")
    assert resp.status_code == 429


def test_gold_has_no_daily_cap(api, auth, gold_listener):
    song = _song()
    for _ in range(70):
        StreamEvent.objects.create(user=gold_listener, song=song)
    resp = auth(gold_listener).post(f"/api/songs/{song.id}/play/")
    assert resp.status_code == 200
    assert resp.json()["remaining"] is None


def test_dashboard_subscriptions_computes_revenue(api, auth, admin, make_user):
    make_user("s1@t.app", tier=SubscriptionTier.SILVER)
    make_user("g1@t.app", tier=SubscriptionTier.GOLD)
    make_user("g2@t.app", tier=SubscriptionTier.GOLD)
    body = auth(admin).get("/api/dashboard/subscriptions/").json()
    assert body["counts"]["gold"] == 2
    assert body["counts"]["silver"] == 1
    assert body["monthlyRevenue"] == 79000 + 2 * 149000


def test_dashboard_subscriptions_admin_only(api, auth, support):
    assert auth(support).get("/api/dashboard/subscriptions/").status_code == 403


def test_dashboard_overview_counts(api, auth, admin, listener):
    from engagement.models import Ticket
    Ticket.objects.create(user=listener, subject="a")  # open
    body = auth(admin).get("/api/dashboard/overview/").json()
    assert body["openTickets"] == 1
    assert "totalUsers" in body
    assert "monthlyRevenue" in body


def test_dashboard_overview_support_hides_admin_only_fields(api, auth, support):
    body = auth(support).get("/api/dashboard/overview/").json()
    assert "openTickets" in body
    assert "totalUsers" not in body
    assert "monthlyRevenue" not in body


def test_approvals_lists_pending_with_email(api, auth, support, make_user):
    from accounts.models import Artist
    from common.constants import ArtistStatus, Role
    applicant = make_user("pending@t.app", role=Role.ARTIST)
    Artist.objects.create(user=applicant, name="در انتظار", status=ArtistStatus.PENDING)
    body = auth(support).get("/api/dashboard/approvals/").json()
    assert "pending@t.app" in [row["email"] for row in body]


def test_admin_can_settle_payout(api, auth, admin, approved_artist):
    _user, artist = approved_artist
    payout = Payout.objects.create(artist=artist, period="1405-03", status="pending")
    resp = auth(admin).post(f"/api/dashboard/audits/{payout.id}/settle/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "settled"


def test_library_search_finds_matching_title(api, auth, listener, approved_artist):
    _user, artist = approved_artist
    _song(artist, title="خورشید", streams=500)
    _song(artist, title="ماه", streams=100)
    body = auth(listener).get("/api/library/?q=خورشید").json()
    titles = [item["title"] for item in body]
    assert "خورشید" in titles
    assert "ماه" not in titles
