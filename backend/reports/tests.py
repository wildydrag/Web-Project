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


def test_recommendations_prefer_the_genre_the_user_listens_to(api, auth, listener, approved_artist, make_user):
    """Core grading condition: suggestions must be logical, not random."""
    from accounts.models import Artist
    from catalog.models import Song, SongArtist
    from common.constants import ArtistStatus, Role, SubscriptionTier
    _user, listened_artist = approved_artist
    # Candidates belong to a *different* artist, so genre affinity — not artist
    # familiarity — is what ranks them.
    other_user = make_user("other-artist@t.app", role=Role.ARTIST, tier=SubscriptionTier.GOLD)
    other_artist = Artist.objects.create(
        user=other_user, name="هنرمند دوم", status=ArtistStatus.APPROVED, verified=True
    )
    today = datetime.date.today()

    def mk(title, genre, artist, streams=100):
        s = Song.objects.create(title=title, genre=genre, duration_sec=180,
                                release_date=today, stream_count=streams)
        SongArtist.objects.create(song=s, artist=artist, position=0)
        return s

    listened = mk("راک شنیده‌شده", Genre.ROCK, listened_artist)
    rock_candidate = mk("راک دیگر", Genre.ROCK, other_artist, streams=10)
    jazz_candidate = mk("جز", Genre.JAZZ, other_artist, streams=9000)  # popular, wrong genre

    StreamEvent.objects.create(user=listener, song=listened)

    body = auth(listener).get("/api/recommendations/").json()
    titles = [row["song"]["title"] for row in body]

    assert listened.title not in titles  # never re-recommend what was played
    assert titles[0] == rock_candidate.title  # genre affinity beats raw popularity
    assert jazz_candidate.title in titles
    assert "راک" in body[0]["reason"]  # explains itself by genre


def test_recommendations_cold_start_returns_popular(api, auth, listener, approved_artist):
    from catalog.models import Song, SongArtist
    _user, artist = approved_artist
    today = datetime.date.today()
    hit = Song.objects.create(title="پرطرفدار", genre=Genre.POP, duration_sec=180,
                              release_date=today, stream_count=5000)
    SongArtist.objects.create(song=hit, artist=artist, position=0)

    body = auth(listener).get("/api/recommendations/").json()  # no history at all
    assert body[0]["song"]["title"] == "پرطرفدار"
    assert "محبوب" in body[0]["reason"]


def test_recommendations_respect_early_access_visibility(api, auth, listener, approved_artist):
    """A basic listener must never be recommended a gold-only early release."""
    from catalog.models import Song, SongArtist
    _user, artist = approved_artist
    future = datetime.date.today() + datetime.timedelta(days=30)
    early = Song.objects.create(title="زودهنگام", genre=Genre.POP, duration_sec=180,
                                release_date=future, early_access=True, stream_count=9999)
    SongArtist.objects.create(song=early, artist=artist, position=0)

    body = auth(listener).get("/api/recommendations/").json()
    assert "زودهنگام" not in [row["song"]["title"] for row in body]


def test_library_search_finds_matching_title(api, auth, listener, approved_artist):
    _user, artist = approved_artist
    _song(artist, title="خورشید", streams=500)
    _song(artist, title="ماه", streams=100)
    body = auth(listener).get("/api/library/?q=خورشید").json()
    titles = [item["title"] for item in body]
    assert "خورشید" in titles
    assert "ماه" not in titles
