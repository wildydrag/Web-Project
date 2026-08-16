"""The seeded catalog must be playable.

Every seeded song used to have no audio, so a listener pressing play heard
nothing and the player looked broken. These tests run the real seed command and
assert the catalog it produces can actually be listened to — the property that
was missing, rather than the row counts, which were always fine.
"""

import io
import wave

import pytest
from django.core.management import call_command

from catalog.models import Song
from common.demo_audio import DURATION_SEC

pytestmark = pytest.mark.django_db


@pytest.fixture
def seeded(db):
    """Run the real seed command.

    Function-scoped on purpose: the autouse `_isolated_media` fixture points
    MEDIA_ROOT at a fresh temp directory per test, so a shared seed would leave
    later tests reading files that are no longer under MEDIA_ROOT.
    """
    call_command("seed", verbosity=0)


class TestSeededAudio:
    def test_every_song_has_an_audio_file(self, seeded):
        missing = [s.id for s in Song.objects.all() if not s.audio.name]
        assert not missing, f"seeded songs without audio: {missing}"

    def test_the_files_are_real_playable_wavs(self, seeded):
        for song in Song.objects.all()[:5]:
            with wave.open(io.BytesIO(song.audio.read()), "rb") as w:
                assert w.getnframes() > 0, f"{song.id} is an empty file"

    def test_stored_duration_matches_the_audio(self, seeded):
        # If these disagree the progress bar lies: it would crawl towards a
        # length the file never reaches, or end long before the bar fills.
        for song in Song.objects.all():
            assert song.duration_sec == DURATION_SEC, (
                f"{song.id} claims {song.duration_sec}s"
            )

    def test_the_api_exposes_a_playable_url(self, seeded, auth, make_user):
        listener = make_user("player@nava.app")
        song = Song.objects.first()
        body = auth(listener).get(f"/api/songs/{song.id}/").json()
        assert body["audioUrl"], "the player has nothing to load"
        assert body["audioUrl"].endswith(".wav")

    def test_tracks_do_not_all_share_one_recording(self, seeded):
        # A single shared clip would still "work", but the catalog would be one
        # track wearing 25 different titles.
        sizes = {s.audio.size for s in Song.objects.all()[:8]}
        contents = {s.audio.read()[:2000] for s in Song.objects.all()[:8]}
        assert len(contents) > 1, f"all clips identical (sizes seen: {sizes})"
