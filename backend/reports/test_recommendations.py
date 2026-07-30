"""Unit tests for the recommender's pure scoring helpers.

The end-to-end behaviour is covered by the API tests in ``tests.py``; these pin
down the individual pieces so a failure identifies one function.
"""

from types import SimpleNamespace

from common.constants import Genre
from reports.recommendations import (
    WEIGHT_FAMILIAR_ARTIST,
    WEIGHT_FOLLOWED_ARTIST,
    WEIGHT_GENRE,
    WEIGHT_POPULARITY,
    _genre_label,
    _primary_artist_name,
    _reason,
)


def _song(genre=Genre.POP, artist_name="بنیامین"):
    """A stand-in for a Song — only the attributes the helpers read."""
    credit = SimpleNamespace(artist=SimpleNamespace(name=artist_name))
    return SimpleNamespace(
        genre=genre,
        artist_credits=SimpleNamespace(all=lambda: [credit]),
    )


class TestReasonText:
    """Every suggestion must explain itself — that is the grading condition."""

    def test_following_the_artist_wins_over_other_reasons(self):
        reason = _reason(_song(), genre_share=0.9, is_followed=True, familiar_plays=5)
        assert reason == "چون بنیامین را دنبال می‌کنید"

    def test_familiarity_is_used_when_not_following(self):
        reason = _reason(_song(), genre_share=0.9, is_followed=False, familiar_plays=3)
        assert reason == "چون قبلاً به بنیامین گوش داده‌اید"

    def test_genre_affinity_is_the_next_fallback(self):
        reason = _reason(_song(Genre.ROCK), genre_share=0.4, is_followed=False, familiar_plays=0)
        assert reason == "چون به سبک راک علاقه دارید"

    def test_popularity_is_the_last_resort(self):
        reason = _reason(_song(), genre_share=0.0, is_followed=False, familiar_plays=0)
        assert reason == "از محبوب‌ترین‌های نوا"

    def test_a_reason_is_never_empty(self):
        for share in (0.0, 0.5):
            for followed in (True, False):
                for familiar in (0, 4):
                    assert _reason(_song(), share, followed, familiar).strip()


class TestGenreLabel:
    def test_known_code_becomes_a_persian_label(self):
        assert _genre_label(Genre.JAZZ) == "جز"

    def test_unknown_code_is_returned_unchanged(self):
        """A legacy row must not break the response."""
        assert _genre_label("bluegrass") == "bluegrass"


class TestPrimaryArtistName:
    def test_uses_the_first_credit(self):
        assert _primary_artist_name(_song(artist_name="مهتاب")) == "مهتاب"

    def test_falls_back_when_a_song_has_no_credits(self):
        orphan = SimpleNamespace(artist_credits=SimpleNamespace(all=lambda: []))
        assert _primary_artist_name(orphan) == "این هنرمند"


class TestScoringWeights:
    """The ordering of the weights is the design; lock it in."""

    def test_genre_affinity_dominates(self):
        assert WEIGHT_GENRE > WEIGHT_FOLLOWED_ARTIST > WEIGHT_FAMILIAR_ARTIST > WEIGHT_POPULARITY

    def test_popularity_alone_cannot_outrank_a_followed_artist(self):
        # Popularity is normalised to at most 1.0, so its maximum contribution
        # must stay below the bonus for following an artist.
        assert WEIGHT_POPULARITY * 1.0 < WEIGHT_FOLLOWED_ARTIST
