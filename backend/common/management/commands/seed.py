"""
Seed the database with the Phase 1 fixtures (faithful port of
``frontend/src/lib/mock/seed.ts``), so the API serves the same catalog the
frontend was built against.

Idempotent: wipes domain tables and recreates. Demo accounts all share the
password ``nava1234`` (documented in the README).

    python manage.py seed
"""

from datetime import datetime

from django.core.files.base import ContentFile

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date

from accounts.models import Artist, Follow, User, UserPreferences
from common.demo_audio import DURATION_SEC as DEMO_AUDIO_SEC, build_demo_wav
from catalog.models import Album, AlbumArtist, Song, SongArtist
from common.constants import (
    ArtistStatus,
    Gender,
    Genre,
    PayoutStatus,
    Role,
    SubscriptionTier,
)
from engagement.models import Notification, Ticket, TicketMessage
from playlists.models import Playlist, PlaylistItem
from reports.models import Payout, StreamEvent
from subscriptions.models import PlatformSettings

DEMO_PASSWORD = "nava1234"

GENRE = {
    "پاپ": Genre.POP,
    "الکترونیک": Genre.ELECTRONIC,
    "فولک": Genre.FOLK,
    "هیپ‌هاپ": Genre.HIPHOP,
    "راک": Genre.ROCK,
    "سنتی": Genre.TRADITIONAL,
    "کلاسیک": Genre.CLASSICAL,
    "جز": Genre.JAZZ,
}

SAMPLE_LYRICS = (
    "این یک نمونه‌متن آهنگ است\n"
    "که در فاز اول به‌صورت ماک نمایش داده می‌شود\n"
    "تا چیدمان بخش «متن آهنگ» در پخش‌کننده مشخص شود."
)


def _dt(iso: str) -> datetime:
    return datetime.fromisoformat(iso.replace("Z", "+00:00"))


def _codes(labels):
    return [GENRE[label] for label in labels]


# --- Fixture data (mirrors seed.ts) ----------------------------------------

ARTISTS = [
    dict(id="ar_benyamin", user_id="us_artist", name="بنیامین",
         bio="خواننده و آهنگساز پاپ با تلفیقی از سازهای ایرانی و الکترونیک.",
         avatar_seed="benyamin", genres=["پاپ", "الکترونیک"], verified=True,
         status="approved", portfolio="https://example.com/benyamin",
         follower_count=184200, monthly_listeners=642000, total_streams=9120000),
    dict(id="ar_mahtab", user_id="us_mahtab", name="مهتاب",
         bio="ترانه‌سرا و خواننده‌ی فولک؛ روایت‌های ساده از زندگی روزمره.",
         avatar_seed="mahtab", genres=["فولک", "پاپ"], verified=True,
         status="approved", portfolio="https://example.com/mahtab",
         follower_count=96500, monthly_listeners=305000, total_streams=4310000),
    dict(id="ar_kaveh", user_id="us_kaveh", name="کاوه",
         bio="تهیه‌کننده‌ی موسیقی الکترونیک و های‌هاپ.",
         avatar_seed="kaveh", genres=["هیپ‌هاپ", "الکترونیک"], verified=True,
         status="approved", portfolio="https://example.com/kaveh",
         follower_count=142000, monthly_listeners=488000, total_streams=6750000),
    dict(id="ar_shabdiz", user_id="us_shabdiz", name="شبدیز",
         bio="گروه راک با حال‌وهوای دهه‌ی هفتاد.",
         avatar_seed="shabdiz", genres=["راک"], verified=True,
         status="approved", portfolio="https://example.com/shabdiz",
         follower_count=58300, monthly_listeners=171000, total_streams=2240000),
    dict(id="ar_ava", user_id="us_ava", name="آوا بَند",
         bio="موسیقی تلفیقی سنتی و کلاسیک.",
         avatar_seed="ava", genres=["سنتی", "کلاسیک"], verified=True,
         status="approved", portfolio="https://example.com/ava",
         follower_count=73900, monthly_listeners=214000, total_streams=3010000),
    dict(id="ar_horshid", user_id="us_pending", name="هورشید",
         bio="هنرمند نوظهور در ژانر الکترونیک.",
         avatar_seed="horshid", genres=["الکترونیک"], verified=False,
         status="pending",
         portfolio="https://soundcloud.com/horshid-demo, https://example.com/horshid-portfolio",
         follower_count=0, monthly_listeners=0, total_streams=0),
]

# Albums: (id, title, artist_ids, genre, release_date, early_access, [songs])
ALBUMS = [
    ("al_paeez", "پاییز هزار رنگ", ["ar_benyamin"], "پاپ", "2025-10-02", False,
     [("آغاز", 213, False), ("هزار رنگ", 247, False),
      ("شب بی‌ستاره", 198, False), ("تا همیشه", 263, False)]),
    ("al_kook", "کوک", ["ar_mahtab"], "فولک", "2025-06-14", False,
     [("کوچه‌باغ", 226, False), ("نامه", 201, False), ("پنجره", 235, False)]),
    ("al_shab", "شب‌شهر", ["ar_kaveh"], "هیپ‌هاپ", "2025-11-20", False,
     [("نئون", 188, False), ("خیابان خیس", 205, False),
      ("هم‌قدم", 219, False), ("بی‌خوابی", 176, False)]),
    ("al_atash", "آتش سرد", ["ar_shabdiz"], "راک", "2025-08-09", False,
     [("جاده", 254, False), ("فریاد", 231, False), ("بازگشت", 268, False)]),
    ("al_neda", "ندای کهن", ["ar_ava"], "سنتی", "2026-01-15", False,
     [("نوای دل", 312, False), ("چهارمضراب", 274, False), ("آواز", 298, False)]),
    ("al_farda", "فردا", ["ar_benyamin", "ar_kaveh"], "الکترونیک", "2026-07-10", True,
     [("طلوع دوباره", 222, True), ("مدار", 240, True), ("فردا", 256, True)]),
]

# Singles: (title, duration, artist_ids, genre, release_date, early_access)
SINGLES = [
    ("تنهاترین", 209, ["ar_benyamin"], "پاپ", "2026-03-01", False),
    ("باران که زد", 231, ["ar_mahtab"], "فولک", "2026-04-18", False),
    ("ریتم شهر", 187, ["ar_kaveh", "ar_shabdiz"], "هیپ‌هاپ", "2026-05-22", False),
    ("نسیم", 244, ["ar_ava"], "کلاسیک", "2026-02-09", False),
    ("نقطه‌ی صفر", 198, ["ar_kaveh"], "الکترونیک", "2026-07-05", True),
]

# Demo + catalog-owner users.
USERS = [
    dict(id="us_basic", email="basic@nava.app", role="listener", display_name="نگار محمدی",
         username="@nava_1042", avatar_seed="negar", gender="female", birth_date="2001-03-21",
         subscription_tier="basic", following=["ar_benyamin"], daily_streams=47),
    dict(id="us_silver", email="silver@nava.app", role="listener", display_name="آرش رضایی",
         username="@nava_2087", avatar_seed="arash", gender="male", birth_date="1998-11-02",
         subscription_tier="silver", subscription_renews_at="2026-07-20T00:00:00Z",
         following=["ar_mahtab", "ar_kaveh"]),
    dict(id="us_gold", email="gold@nava.app", role="listener", display_name="سارا کریمی",
         username="@nava_3001", avatar_seed="sara", gender="female", birth_date="1996-07-15",
         subscription_tier="gold", subscription_renews_at="2026-08-30T00:00:00Z",
         following=["ar_benyamin", "ar_mahtab", "ar_ava"]),
    dict(id="us_artist", email="artist@nava.app", role="artist", display_name="بنیامین",
         username="@nava_artist_01", avatar_seed="benyamin", gender="male", birth_date="1990-01-30",
         subscription_tier="gold", subscription_renews_at="2026-12-01T00:00:00Z",
         following=["ar_kaveh"]),
    dict(id="us_pending", email="pending@nava.app", role="artist", display_name="هورشید",
         username="@nava_artist_02", avatar_seed="horshid", gender="unspecified",
         subscription_tier="basic", following=[]),
    dict(id="us_support", email="support@nava.app", role="support", display_name="مریم (پشتیبانی)",
         username="@nava_support", avatar_seed="support", gender="female",
         subscription_tier="basic", following=[]),
    dict(id="us_admin", email="admin@nava.app", role="admin", display_name="مدیر سامانه",
         username="@nava_admin", avatar_seed="admin", gender="unspecified",
         subscription_tier="basic", following=[], is_staff=True, is_superuser=True),
    dict(id="us_mahtab", email="ar_mahtab@nava.app", role="artist", display_name="مهتاب",
         username="@nava_artist_10", avatar_seed="mahtab", gender="unspecified",
         subscription_tier="gold", subscription_renews_at="2027-01-01T00:00:00Z", following=[]),
    dict(id="us_kaveh", email="ar_kaveh@nava.app", role="artist", display_name="کاوه",
         username="@nava_artist_11", avatar_seed="kaveh", gender="unspecified",
         subscription_tier="gold", subscription_renews_at="2027-01-01T00:00:00Z", following=[]),
    dict(id="us_shabdiz", email="ar_shabdiz@nava.app", role="artist", display_name="شبدیز",
         username="@nava_artist_12", avatar_seed="shabdiz", gender="unspecified",
         subscription_tier="gold", subscription_renews_at="2027-01-01T00:00:00Z", following=[]),
    dict(id="us_ava", email="ar_ava@nava.app", role="artist", display_name="آوا بَند",
         username="@nava_artist_13", avatar_seed="ava", gender="unspecified",
         subscription_tier="gold", subscription_renews_at="2027-01-01T00:00:00Z", following=[]),
]

PLAYLISTS = [
    ("pl_morning", "us_gold", "صبح‌های آرام", ["sg_01", "sg_05", "sg_11", "sg_17"], "2026-05-10T00:00:00Z"),
    ("pl_focus", "us_gold", "تمرکز", ["sg_08", "sg_14", "sg_18"], "2026-05-28T00:00:00Z"),
    ("pl_drive", "us_gold", "جاده", ["sg_11", "sg_12", "sg_19"], "2026-06-15T00:00:00Z"),
]

NOTIFICATIONS = [
    ("nt_01", "us_silver", "subscription_expiring", "اشتراک نقره‌ای شما رو به پایان است",
     "۵ روز تا پایان اشتراک شما باقی مانده. برای تمدید به تنظیمات مراجعه کنید.",
     "2026-06-21T09:00:00Z", False, "/settings"),
    ("nt_02", "us_gold", "new_release", "اثر جدید از بنیامین",
     "آلبوم «فردا» منتشر شد. همین حالا گوش کنید.", "2026-06-22T18:30:00Z", False, "/album/al_farda"),
    ("nt_03", "us_gold", "new_release", "تک‌آهنگ جدید از مهتاب",
     "«باران که زد» اکنون در دسترس است.", "2026-06-18T11:00:00Z", True, "/album/al_kook"),
    ("nt_04", "us_artist", "artist_payout", "محاسبات مالی خرداد آماده شد",
     "گزارش شنوندگان و استریم‌های این ماه شما ثبت شد.", "2026-06-20T08:00:00Z", False, ""),
    ("nt_05", "us_pending", "artist_verdict", "درخواست هنرمندی شما در حال بررسی است",
     "نمونه‌کارهای شما دریافت شد و به‌زودی بررسی می‌شود.", "2026-06-19T08:35:00Z", True, ""),
    ("nt_06", "us_support", "new_ticket", "تیکت جدید: مشکل در پرداخت",
     "کاربر آرش رضایی یک تیکت پشتیبانی ثبت کرد.", "2026-06-23T14:10:00Z", False, "/dashboard/tickets"),
    ("nt_07", "us_support", "new_artist_request", "درخواست احراز هویت جدید",
     "هورشید درخواست حساب هنرمند ثبت کرد.", "2026-06-19T08:31:00Z", False, "/dashboard/approvals"),
    ("nt_08", "us_admin", "new_artist_request", "درخواست احراز هویت جدید",
     "هورشید درخواست حساب هنرمند ثبت کرد.", "2026-06-19T08:31:00Z", False, "/dashboard/approvals"),
]

# Tickets: (id, user_id, subject, status, created, [(author_role, author_name, body, created)])
TICKETS = [
    ("TK-1042", "us_silver", "مشکل در پرداخت اشتراک", "open", "2026-06-23T14:05:00Z",
     [("user", "آرش رضایی", "سلام، هنگام ارتقا به اشتراک نقره‌ای پرداختم ناموفق شد ولی مبلغ کم شد.",
       "2026-06-23T14:05:00Z")]),
    ("TK-1041", "us_basic", "سوال درباره محدودیت پلی‌لیست", "answered", "2026-06-20T10:00:00Z",
     [("user", "نگار محمدی", "چرا نمی‌توانم پلی‌لیست هفتم را بسازم؟", "2026-06-20T10:00:00Z"),
      ("support", "مریم (پشتیبانی)",
       "سلام، در اشتراک پایه حداکثر ۶ پلی‌لیست می‌توانید بسازید. با ارتقا به نقره‌ای این محدودیت برداشته می‌شود.",
       "2026-06-20T11:30:00Z")]),
    ("TK-1039", "us_gold", "درخواست حذف یک آهنگ از تاریخچه", "closed", "2026-06-12T09:20:00Z",
     [("user", "سارا کریمی", "می‌خواهم تاریخچه‌ی پخشم پاک شود.", "2026-06-12T09:20:00Z"),
      ("support", "مریم (پشتیبانی)", "انجام شد. موردی دیگری بود در خدمتم.", "2026-06-12T10:00:00Z")]),
]


class Command(BaseCommand):
    help = "Load the Phase 1 fixtures into the database (idempotent)."

    @transaction.atomic
    def handle(self, *args, **options):
        self._wipe()
        PlatformSettings.load()  # defaults 79000 / 149000

        artists = self._seed_artists_and_users()
        songs = self._seed_catalog(artists)
        self._seed_follows()
        self._seed_playlists(songs)
        self._seed_notifications()
        self._seed_tickets()
        self._seed_listening_history(songs)
        self._seed_daily_streams(songs)
        self._seed_payouts(artists)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded: {User.objects.count()} users, {Artist.objects.count()} artists, "
            f"{Album.objects.count()} albums, {Song.objects.count()} songs, "
            f"{Playlist.objects.count()} playlists, {Notification.objects.count()} notifications, "
            f"{Ticket.objects.count()} tickets, {Payout.objects.count()} payouts. "
            f"Demo password: {DEMO_PASSWORD}"
        ))

    def _wipe(self):
        for model in (StreamEvent, Payout, PlaylistItem, Playlist, TicketMessage, Ticket,
                      Notification, SongArtist, AlbumArtist, Song, Album, Follow,
                      UserPreferences, Artist, User, PlatformSettings):
            model.objects.all().delete()

    def _seed_artists_and_users(self) -> dict[str, Artist]:
        users_by_id = {}
        for src in USERS:
            u = dict(src)  # copy — never mutate the module-level fixtures
            u.pop("following", None)
            u.pop("daily_streams", None)
            renews = u.pop("subscription_renews_at", None)
            birth = u.pop("birth_date", None)
            user = User.objects.create_user(
                password=DEMO_PASSWORD,
                subscription_renews_at=_dt(renews) if renews else None,
                birth_date=parse_date(birth) if birth else None,
                **u,
            )
            users_by_id[user.id] = user
            UserPreferences.objects.create(user=user)

        artists = {}
        for a in ARTISTS:
            artists[a["id"]] = Artist.objects.create(
                id=a["id"], user=users_by_id[a["user_id"]], name=a["name"], bio=a["bio"],
                avatar_seed=a["avatar_seed"], genres=_codes(a["genres"]), verified=a["verified"],
                status=a["status"], portfolio=a["portfolio"], follower_count=a["follower_count"],
                monthly_listeners=a["monthly_listeners"], total_streams=a["total_streams"],
            )
        return artists

    def _seed_catalog(self, artists) -> dict[str, Song]:
        songs = {}
        counter = 1

        # `fixture_duration` is the length the Phase 1 mock invented for each
        # track. It is kept in the fixtures for reference but deliberately not
        # used: the real length of the generated audio is what gets stored, so
        # the catalog never claims a duration the file does not have.
        def make_song(title, fixture_duration, artist_ids, genre_label, release, album,
                      early, cover_seed, track_number=None):
            nonlocal counter
            i = counter
            counter += 1
            sid = f"sg_{i:02d}"
            streams = 28000 + i * 5417
            song = Song.objects.create(
                id=sid, title=title, album=album, track_number=track_number,
                cover_seed=cover_seed, duration_sec=DEMO_AUDIO_SEC, genre=GENRE[genre_label],
                release_date=parse_date(release), lyrics=SAMPLE_LYRICS if album else "",
                early_access=early, stream_count=streams, listener_count=round(streams * 0.34),
            )
            # Give every seeded track real, playable audio. `duration_sec` above
            # is the generated clip's length rather than the fixture's invented
            # one, so the progress bar and the sound agree.
            song.audio.save(f"{sid}.wav", ContentFile(build_demo_wav(i)), save=True)
            for pos, aid in enumerate(artist_ids):
                SongArtist.objects.create(song=song, artist=artists[aid], position=pos)
            songs[sid] = song
            return song

        for aid, title, artist_ids, genre_label, release, early, tracks in ALBUMS:
            album = Album.objects.create(
                id=aid, title=title, cover_seed=aid, release_date=parse_date(release),
                genre=GENRE[genre_label], type="album", early_access=early,
            )
            for pos, artist_id in enumerate(artist_ids):
                AlbumArtist.objects.create(album=album, artist=artists[artist_id], position=pos)
            for tnum, (t_title, dur, t_early) in enumerate(tracks, start=1):
                make_song(t_title, dur, artist_ids, genre_label, release, album, t_early, aid, tnum)

        for title, dur, artist_ids, genre_label, release, early in SINGLES:
            make_song(title, dur, artist_ids, genre_label, release, None, early, f"single-{counter}")
        return songs

    def _seed_follows(self):
        for u in USERS:
            follower = User.objects.get(id=u["id"])
            for aid in u.get("following", []):
                Follow.objects.get_or_create(follower=follower, artist=Artist.objects.get(id=aid))

    def _seed_playlists(self, songs):
        for pid, owner_id, name, song_ids, created in PLAYLISTS:
            pl = Playlist.objects.create(
                id=pid, owner=User.objects.get(id=owner_id), name=name, cover_seed=pid,
            )
            Playlist.objects.filter(pk=pl.pk).update(created_at=_dt(created))
            for pos, sid in enumerate(song_ids):
                PlaylistItem.objects.create(playlist=pl, song=songs[sid], position=pos)

    def _seed_notifications(self):
        for nid, uid, kind, title, body, created, read, href in NOTIFICATIONS:
            n = Notification.objects.create(
                id=nid, user=User.objects.get(id=uid), kind=kind, title=title,
                body=body, read=read, href=href,
            )
            Notification.objects.filter(pk=n.pk).update(created_at=_dt(created))

    def _seed_tickets(self):
        for tid, uid, subject, status, created, messages in TICKETS:
            ticket = Ticket.objects.create(
                id=tid, user=User.objects.get(id=uid), subject=subject, status=status,
            )
            Ticket.objects.filter(pk=ticket.pk).update(created_at=_dt(created))
            for role, name, body, msg_created in messages:
                m = TicketMessage.objects.create(
                    ticket=ticket, author_role=role, author_name=name, body=body,
                )
                TicketMessage.objects.filter(pk=m.pk).update(created_at=_dt(msg_created))

    def _seed_listening_history(self, songs):
        """Create a month of plays so the payout report has real data to sum.

        Payouts are derived from :class:`StreamEvent`, so without a history the
        auditing table would legitimately read zero. Volumes are deterministic
        (no randomness) to keep runs reproducible, and each song gets a
        different-sized audience so the per-artist figures differ.
        """
        listeners = list(User.objects.filter(role__in=[Role.LISTENER, Role.ARTIST]))
        events = []
        for index, (song_id, song) in enumerate(sorted(songs.items())):
            # 4-13 distinct listeners per track, each playing it 1-3 times.
            audience = listeners[: 4 + (index % 10)]
            for position, listener in enumerate(audience):
                for _ in range(1 + (index + position) % 3):
                    events.append(StreamEvent(user=listener, song=song))
        StreamEvent.objects.bulk_create(events)
        return len(events)

    def _seed_payouts(self, artists):
        """Build the audit table from the seeded history using the real formula."""
        from reports.services import recalculate_payouts

        period = timezone.localdate().strftime("%Y-%m")
        payouts = recalculate_payouts(period)
        # Mark alternate rows settled so both payment states are visible in the UI.
        for i, payout in enumerate(sorted(payouts, key=lambda p: p.artist.name)):
            if i % 2:
                payout.status = PayoutStatus.SETTLED
                payout.save(update_fields=["status"])

    def _seed_daily_streams(self, songs):
        """Top the basic demo user up to 47 plays *today* so the daily cap (60)
        is near its limit — useful for demoing the remaining-streams UI."""
        basic = User.objects.get(id="us_basic")
        today = timezone.localdate()
        already = StreamEvent.objects.filter(user=basic, created_at__date=today).count()
        missing = max(0, 47 - already)
        StreamEvent.objects.bulk_create(
            [StreamEvent(user=basic, song=songs["sg_01"]) for _ in range(missing)]
        )
