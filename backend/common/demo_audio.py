"""Generate short, playable demo tracks for the seeded catalog.

The seeded songs used to have no audio at all, so pressing play produced
silence — which made the player look broken even after it was wired to a real
`<audio>` element. Shipping real music is not an option (licensing, and a repo
full of binaries), so the seed synthesises a few seconds of tone instead.

Everything here is standard library: a WAV file is a header plus raw samples,
so no encoder or extra dependency is involved. Each song gets a different
melody, derived from its id, so the catalog does not sound like one track
repeated 25 times.
"""

import io
import math
import struct
import wave
from functools import lru_cache

SAMPLE_RATE = 16_000          # plenty for a demo tone, and keeps files small
DURATION_SEC = 8
AMPLITUDE = 0.28              # comfortably below clipping

#: A pentatonic scale avoids dissonance whichever order the notes come out in.
SCALE_HZ = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25]


def _envelope(position: float, length: float) -> float:
    """Fade each note in and out so the track has no audible clicks."""
    edge = min(0.04, length / 4)
    if position < edge:
        return position / edge
    if position > length - edge:
        return max(0.0, (length - position) / edge)
    return 1.0


def _melody(seed: int, notes: int) -> list[float]:
    """A short repeatable note sequence, distinct per seed."""
    # A plain linear congruential step keeps this deterministic without pulling
    # in `random`'s global state, so re-seeding always produces the same audio.
    value = (seed * 1103515245 + 12345) & 0x7FFFFFFF
    out = []
    for _ in range(notes):
        out.append(SCALE_HZ[value % len(SCALE_HZ)])
        value = (value * 1103515245 + 12345) & 0x7FFFFFFF
    return out


NOTE_LEN_SEC = 0.5


@lru_cache(maxsize=len(SCALE_HZ))
def _render_note(frequency: float) -> bytes:
    """Synthesise one note. Cached: the whole catalog reuses eight of them.

    Seeding 25 tracks would otherwise synthesise millions of samples in pure
    Python; with the cache only the eight distinct pitches are ever computed.
    """
    samples = bytearray()
    for sample in range(int(SAMPLE_RATE * NOTE_LEN_SEC)):
        t = sample / SAMPLE_RATE
        # A little second harmonic so it sounds like an instrument rather than
        # a test tone.
        wave_value = (
            math.sin(2 * math.pi * frequency * t)
            + 0.3 * math.sin(4 * math.pi * frequency * t)
        ) / 1.3
        value = wave_value * AMPLITUDE * _envelope(t, NOTE_LEN_SEC)
        samples += struct.pack("<h", int(max(-1.0, min(1.0, value)) * 32767))
    return bytes(samples)


def build_demo_wav(seed: int, duration_sec: int = DURATION_SEC) -> bytes:
    """Return a complete WAV file: `duration_sec` of simple melody."""
    note_count = max(1, int(duration_sec / NOTE_LEN_SEC))
    frames = b"".join(_render_note(f) for f in _melody(seed, note_count))

    buffer = io.BytesIO()
    with wave.open(buffer, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(frames)
    return buffer.getvalue()
