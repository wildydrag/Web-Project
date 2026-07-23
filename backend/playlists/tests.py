"""Playlist tests: ownership scoping, tier limit, add/remove songs."""

import datetime

import pytest

from catalog.models import Song
from common.constants import Genre
from playlists.models import Playlist

pytestmark = pytest.mark.django_db


def _song():
    return Song.objects.create(
        title="آهنگ", genre=Genre.POP, duration_sec=100,
        release_date=datetime.date.today(),
    )


def test_create_and_list_own_playlist(api, auth, listener):
    client = auth(listener)
    created = client.post("/api/playlists/", {"name": "لیست من"}, format="json")
    assert created.status_code == 201
    assert created.json()["ownerId"] == listener.id
    listed = client.get("/api/playlists/")
    assert listed.json()["count"] == 1


def test_playlists_are_owner_scoped(api, auth, listener, make_user):
    other = make_user("other@test.app")
    Playlist.objects.create(owner=other, name="مال دیگری")
    assert auth(listener).get("/api/playlists/").json()["count"] == 0


def test_basic_tier_playlist_limit_enforced(api, auth, listener):
    client = auth(listener)  # basic → limit 6
    for i in range(6):
        assert client.post("/api/playlists/", {"name": f"pl{i}"}, format="json").status_code == 201
    seventh = client.post("/api/playlists/", {"name": "هفتم"}, format="json")
    assert seventh.status_code == 400


def test_gold_tier_playlist_limit_unlimited(api, auth, gold_listener):
    client = auth(gold_listener)
    for i in range(8):
        assert client.post("/api/playlists/", {"name": f"pl{i}"}, format="json").status_code == 201


def test_add_and_remove_song(api, auth, gold_listener):
    client = auth(gold_listener)
    pl = client.post("/api/playlists/", {"name": "میکس"}, format="json").json()
    song = _song()
    added = client.post(f"/api/playlists/{pl['id']}/add-song/", {"songId": song.id}, format="json")
    assert added.json()["songIds"] == [song.id]
    removed = client.post(f"/api/playlists/{pl['id']}/remove-song/", {"songId": song.id}, format="json")
    assert removed.json()["songIds"] == []
