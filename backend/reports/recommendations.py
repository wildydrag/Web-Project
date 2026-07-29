"""
Song recommender (bonus feature).

Recommendations are derived from the listener's own history — the
:class:`~reports.models.StreamEvent` log — so suggestions are explainable rather
than random. Each result carries the reason it was chosen, which is what the UI
shows to the user.

Scoring, highest first:

* **Genre affinity** — how much of the user's listening is in this genre.
* **Followed artist** — the artist is one the user follows.
* **Familiar artist** — the user has played this artist before.
* **Popularity** — a small tie-breaker so equally-scored picks are sensible.

Already-played songs are excluded, and the catalog is filtered through the same
early-access visibility rule used everywhere else, so a non-gold listener is
never recommended a release they cannot open.

Cold start: a user with no listening history gets the most popular visible
songs, labelled as such.
"""

from dataclasses import dataclass
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone

from accounts.models import Follow
from catalog.models import Song
from common.constants import Genre

from .models import StreamEvent

# How far back listening history is considered relevant.
HISTORY_WINDOW_DAYS = 90
# Weights — genre affinity dominates, popularity only breaks ties.
WEIGHT_GENRE = 10.0
WEIGHT_FOLLOWED_ARTIST = 4.0
WEIGHT_FAMILIAR_ARTIST = 2.0
WEIGHT_POPULARITY = 1.0


@dataclass
class Recommendation:
    song: Song
    score: float
    reason: str


def recommend_for(user, limit: int = 8) -> list[Recommendation]:
    """Return up to `limit` scored recommendations for `user`."""
    since = timezone.now() - timedelta(days=HISTORY_WINDOW_DAYS)
    history = StreamEvent.objects.filter(user=user, created_at__gte=since)

    genre_plays = _counts(history, "song__genre")
    artist_plays = _counts(history, "song__artists")
    played_ids = set(history.values_list("song_id", flat=True))
    followed_ids = set(
        Follow.objects.filter(follower=user).values_list("artist_id", flat=True)
    )

    candidates = (
        Song.objects.visible_to(user)
        .exclude(id__in=played_ids)
        .prefetch_related("artist_credits__artist")
    )

    if not genre_plays and not followed_ids:
        return _popular_fallback(candidates, limit)

    total_plays = sum(genre_plays.values()) or 1
    max_streams = max((s.stream_count for s in candidates), default=0) or 1

    scored: list[Recommendation] = []
    for song in candidates:
        artist_ids = [credit.artist_id for credit in song.artist_credits.all()]
        genre_share = genre_plays.get(song.genre, 0) / total_plays
        is_followed = any(a in followed_ids for a in artist_ids)
        familiar_plays = sum(artist_plays.get(a, 0) for a in artist_ids)

        score = (
            WEIGHT_GENRE * genre_share
            + WEIGHT_FOLLOWED_ARTIST * (1.0 if is_followed else 0.0)
            + WEIGHT_FAMILIAR_ARTIST * (1.0 if familiar_plays else 0.0)
            + WEIGHT_POPULARITY * (song.stream_count / max_streams)
        )
        if score <= 0:
            continue
        scored.append(
            Recommendation(
                song=song,
                score=round(score, 4),
                reason=_reason(song, genre_share, is_followed, familiar_plays),
            )
        )

    scored.sort(key=lambda rec: rec.score, reverse=True)
    return scored[:limit]


# --- internals -------------------------------------------------------------

def _counts(queryset, field: str) -> dict:
    """`{value: play_count}` for a grouping field, ignoring NULL groups."""
    rows = queryset.values(field).annotate(n=Count("id"))
    return {row[field]: row["n"] for row in rows if row[field] is not None}


def _popular_fallback(candidates, limit: int) -> list[Recommendation]:
    top = candidates.order_by("-stream_count")[:limit]
    return [
        Recommendation(song=song, score=0.0, reason="از محبوب‌ترین‌های نوا")
        for song in top
    ]


def _reason(song, genre_share: float, is_followed: bool, familiar_plays: int) -> str:
    """The single most relevant explanation, in the user's language."""
    artist = _primary_artist_name(song)
    if is_followed:
        return f"چون {artist} را دنبال می‌کنید"
    if familiar_plays:
        return f"چون قبلاً به {artist} گوش داده‌اید"
    if genre_share > 0:
        return f"چون به سبک {_genre_label(song.genre)} علاقه دارید"
    return "از محبوب‌ترین‌های نوا"


def _primary_artist_name(song) -> str:
    credits = list(song.artist_credits.all())
    return credits[0].artist.name if credits else "این هنرمند"


def _genre_label(code: str) -> str:
    try:
        return Genre(code).label
    except ValueError:
        return code
