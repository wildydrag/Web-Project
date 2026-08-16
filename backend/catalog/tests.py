"""Catalog tests: visibility, analytics gating, publish permissions, uploads."""

from io import BytesIO

import pytest
from PIL import Image

from django.core.files.uploadedfile import SimpleUploadedFile

from catalog.models import Album, Song
from engagement.models import Notification

pytestmark = pytest.mark.django_db


def _results(resp):
    body = resp.json()
    return body["results"] if isinstance(body, dict) and "results" in body else body


def _audio():
    from django.core.files.uploadedfile import SimpleUploadedFile
    return SimpleUploadedFile("track.mp3", b"ID3fake-audio-bytes", content_type="audio/mpeg")


def _png():
    from django.core.files.uploadedfile import SimpleUploadedFile
    buf = BytesIO()
    Image.new("RGB", (2, 2), "teal").save(buf, format="PNG")
    return SimpleUploadedFile("c.png", buf.getvalue(), content_type="image/png")


def test_song_list_requires_auth(api, catalog):
    assert api.get("/api/songs/").status_code == 401


def test_early_access_hidden_from_basic(api, auth, listener, catalog):
    titles = [s["title"] for s in _results(auth(listener).get("/api/songs/"))]
    assert "آهنگ عادی" in titles
    assert "زودهنگام" not in titles  # early-access, hidden from basic


def test_early_access_visible_to_gold(api, auth, gold_listener, catalog):
    titles = [s["title"] for s in _results(auth(gold_listener).get("/api/songs/"))]
    assert "زودهنگام" in titles


def test_artist_analytics_hidden_from_basic(api, auth, listener, catalog):
    artist = catalog["artist"]
    body = auth(listener).get(f"/api/artists/{artist.id}/").json()
    assert "followerCount" not in body
    assert "monthlyListeners" not in body
    assert "totalStreams" not in body


def test_artist_analytics_visible_to_gold(api, auth, gold_listener, catalog):
    artist = catalog["artist"]
    body = auth(gold_listener).get(f"/api/artists/{artist.id}/").json()
    assert body["followerCount"] == 1000
    assert body["monthlyListeners"] == 5000
    assert body["totalStreams"] == 90000


def test_approved_artist_can_publish_single(api, auth, approved_artist):
    user, artist = approved_artist
    resp = auth(user).post("/api/songs/", {
        "title": "تک‌آهنگ نو", "genre": "پاپ", "durationSec": 210,
        "releaseDate": "2026-07-01", "lyrics": "متن",
    }, format="json")
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "تک‌آهنگ نو"
    assert body["artistIds"] == [artist.id]
    assert body["genre"] == "پاپ"


def test_listener_cannot_publish(api, auth, listener):
    resp = auth(listener).post("/api/songs/", {
        "title": "x", "genre": "پاپ", "durationSec": 100, "releaseDate": "2026-07-01",
    }, format="json")
    assert resp.status_code == 403


def test_artist_cannot_edit_another_artists_song(api, auth, make_user, catalog):
    from accounts.models import Artist
    from common.constants import ArtistStatus, Role, SubscriptionTier
    other_user = make_user("other@test.app", role=Role.ARTIST, tier=SubscriptionTier.GOLD)
    Artist.objects.create(user=other_user, name="دیگری", status=ArtistStatus.APPROVED, verified=True)
    resp = auth(other_user).patch(f"/api/songs/{catalog['normal'].id}/",
                                  {"title": "دزدی"}, format="json")
    assert resp.status_code == 404  # not in the requester's owned queryset


def test_owner_can_delete_own_song(api, auth, approved_artist, catalog):
    user, _artist = approved_artist
    resp = auth(user).delete(f"/api/songs/{catalog['normal'].id}/")
    assert resp.status_code == 204
    assert not Song.objects.filter(id=catalog["normal"].id).exists()


def test_publish_fans_out_new_release_to_followers(api, auth, approved_artist, make_user):
    user, artist = approved_artist
    from accounts.models import Follow
    from common.constants import Role
    follower = make_user("fan@test.app", role=Role.LISTENER)
    Follow.objects.create(follower=follower, artist=artist)
    auth(user).post("/api/songs/", {
        "title": "اثر جدید", "genre": "پاپ", "durationSec": 200, "releaseDate": "2026-07-01",
    }, format="json")
    assert Notification.objects.filter(user=follower, kind="new_release").count() == 1


def test_earnings_are_computed_server_side_for_the_owning_artist(api, auth, approved_artist, catalog):
    """Money is never derived in the browser (brief §7.3)."""
    from reports.services import reward_for
    user, _artist = approved_artist
    song = catalog["normal"]
    body = auth(user).get(f"/api/songs/{song.id}/").json()
    assert body["revenueToman"] == reward_for(song.stream_count, song.listener_count)


def test_earnings_are_hidden_from_other_listeners(api, auth, listener, catalog):
    body = auth(listener).get(f"/api/songs/{catalog['normal'].id}/").json()
    assert "revenueToman" not in body


def test_staff_may_see_earnings(api, auth, admin, catalog):
    body = auth(admin).get(f"/api/songs/{catalog['normal'].id}/").json()
    assert "revenueToman" in body


def test_publish_album_multipart_with_json_tracks(api, auth, approved_artist):
    """The UI sends album tracks as a JSON string when a cover file is attached."""
    import json
    user, _artist = approved_artist
    resp = auth(user).post("/api/albums/", {
        "title": "آلبوم با کاور", "genre": "پاپ", "releaseDate": "2026-07-01",
        "cover": _png(),
        "tracks": json.dumps([
            {"title": "ترک یک", "durationSec": 200},
            {"title": "ترک دو", "durationSec": 180},
        ]),
    }, format="multipart")
    assert resp.status_code == 201
    body = resp.json()
    assert body["coverUrl"]
    assert len(body["songIds"]) == 2


def test_publish_single_with_audio_upload(api, auth, approved_artist):
    user, _artist = approved_artist
    resp = auth(user).post("/api/songs/", {
        "title": "با فایل", "genre": "راک", "durationSec": 190,
        "releaseDate": "2026-07-01", "audio": _audio(), "cover": _png(),
    }, format="multipart")
    assert resp.status_code == 201
    body = resp.json()
    assert body["audioUrl"] and body["coverUrl"]
    song = Song.objects.get(id=body["id"])
    assert song.audio.name and song.cover.name


class TestAlbumTrackUploads:
    """Per-track audio and artwork when publishing an album.

    A multipart body cannot nest a file inside the JSON `tracks` string, so each
    track's files travel as their own `track_audio_<i>` / `track_cover_<i>`
    fields and are matched back to the track by position. Getting that pairing
    wrong is the kind of bug that silently attaches the wrong file, so these
    tests check the association, not merely that something was saved.
    """

    def _publish(self, client, extra):
        import json
        body = {
            "title": "آلبوم صوتی", "genre": "پاپ", "releaseDate": "2026-07-01",
            "tracks": json.dumps([
                {"title": "ترک یک", "durationSec": 200},
                {"title": "ترک دو", "durationSec": 180},
            ]),
        }
        body.update(extra)
        return client.post("/api/albums/", body, format="multipart")

    def test_each_track_keeps_its_own_audio(self, auth, approved_artist):
        user, _artist = approved_artist
        resp = self._publish(auth(user), {
            "track_audio_0": SimpleUploadedFile("one.mp3", b"ID3-one", content_type="audio/mpeg"),
            "track_audio_1": SimpleUploadedFile("two.mp3", b"ID3-two", content_type="audio/mpeg"),
        })
        assert resp.status_code == 201
        songs = Song.objects.filter(album_id=resp.json()["id"]).order_by("track_number")
        assert [s.audio.read() for s in songs] == [b"ID3-one", b"ID3-two"]

    def test_the_api_returns_a_playable_url_per_track(self, auth, approved_artist):
        user, _artist = approved_artist
        resp = self._publish(auth(user), {
            "track_audio_0": _audio(), "track_audio_1": _audio(),
        })
        album_id = resp.json()["id"]
        for song_id in resp.json()["songIds"]:
            body = auth(user).get(f"/api/songs/{song_id}/").json()
            assert body["audioUrl"], f"{song_id} has no audioUrl"
        assert Album.objects.get(id=album_id).songs.count() == 2

    def test_a_track_may_carry_its_own_cover(self, auth, approved_artist):
        user, _artist = approved_artist
        resp = self._publish(auth(user), {"track_cover_1": _png()})
        songs = Song.objects.filter(album_id=resp.json()["id"]).order_by("track_number")
        assert not songs[0].cover.name          # no per-track cover given
        assert songs[1].cover.name              # this one had its own

    def test_tracks_fall_back_to_the_album_cover(self, auth, approved_artist):
        user, _artist = approved_artist
        resp = self._publish(auth(user), {"cover": _png()})
        songs = Song.objects.filter(album_id=resp.json()["id"])
        assert all(s.cover.name for s in songs), "tracks should inherit the album artwork"

    def test_publishing_without_any_audio_still_works(self, auth, approved_artist):
        # Metadata-only albums stay valid; audio is optional.
        user, _artist = approved_artist
        resp = self._publish(auth(user), {})
        assert resp.status_code == 201
        assert all(not s.audio.name for s in Song.objects.filter(album_id=resp.json()["id"]))

    def test_a_file_for_a_track_that_does_not_exist_is_ignored(self, auth, approved_artist):
        user, _artist = approved_artist
        resp = self._publish(auth(user), {"track_audio_7": _audio()})
        assert resp.status_code == 201
        assert Song.objects.filter(album_id=resp.json()["id"]).count() == 2
