"""Unit tests for the generated demo audio.

No database and no HTTP: these call the generator directly, so a failure points
at the synthesis rather than at the seed command around it.

What matters is that the bytes are a *real, playable* WAV. A file that merely
exists is what the catalog had before, and it is why pressing play was silent.
"""

import io
import wave

from common.demo_audio import DURATION_SEC, SAMPLE_RATE, build_demo_wav


def _open(data: bytes) -> wave.Wave_read:
    return wave.open(io.BytesIO(data), "rb")


class TestGeneratedFile:
    def test_the_bytes_are_a_readable_wav(self):
        # wave.open raises if the header is malformed, which is the whole point.
        with _open(build_demo_wav(1)) as w:
            assert w.getnchannels() == 1
            assert w.getsampwidth() == 2
            assert w.getframerate() == SAMPLE_RATE

    def test_it_announces_a_riff_header(self):
        data = build_demo_wav(1)
        assert data[:4] == b"RIFF" and data[8:12] == b"WAVE"

    def test_it_is_the_advertised_length(self):
        with _open(build_demo_wav(3)) as w:
            assert round(w.getnframes() / w.getframerate()) == DURATION_SEC

    def test_a_custom_length_is_honoured(self):
        with _open(build_demo_wav(3, duration_sec=2)) as w:
            assert round(w.getnframes() / w.getframerate()) == 2

    def test_it_actually_contains_sound(self):
        # An all-zero file is a valid WAV and completely silent — exactly the
        # failure this generator exists to avoid.
        with _open(build_demo_wav(5)) as w:
            frames = w.readframes(w.getnframes())
        assert any(frames), "generated audio is silent"

    def test_it_does_not_clip(self):
        import struct
        with _open(build_demo_wav(9)) as w:
            frames = w.readframes(w.getnframes())
        peak = max(abs(v) for (v,) in struct.iter_unpack("<h", frames))
        assert peak < 32767, "samples reach full scale and will distort"


class TestVariation:
    def test_the_same_seed_gives_the_same_audio(self):
        assert build_demo_wav(4) == build_demo_wav(4)

    def test_different_seeds_give_different_audio(self):
        # Otherwise every track in the catalog sounds identical.
        assert build_demo_wav(1) != build_demo_wav(2)

    def test_many_seeds_stay_distinct(self):
        clips = {build_demo_wav(i) for i in range(1, 11)}
        assert len(clips) > 1
