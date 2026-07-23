"""Catalog tests: visibility, analytics gating, publish permissions, uploads."""

from io import BytesIO

import pytest
from PIL import Image

from catalog.models import Song
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
