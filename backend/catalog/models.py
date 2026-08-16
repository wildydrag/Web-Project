"""Catalog domain: albums, songs, and their ordered artist credits."""

from django.db import models
from django.db.models import Q
from django.utils import timezone

from accounts.models import Artist
from common.constants import Genre, ReleaseType, SubscriptionTier
from common.models import PrefixedIDModel, TimeStampedModel


class VisibleQuerySet(models.QuerySet):
    """Shared early-access visibility filter for catalog reads.

    Non-early releases are always visible; an ``early_access`` release is visible
    to gold users immediately, and to everyone else only once ``release_date``
    has arrived. Replaces the Phase 1 client-side ``isVisibleToUser``.
    """

    def visible_to(self, user):
        if user is not None and getattr(user, "current_tier", None) == SubscriptionTier.GOLD:
            return self
        today = timezone.localdate()
        return self.filter(Q(early_access=False) | Q(release_date__lte=today))


class Album(PrefixedIDModel, TimeStampedModel):
    id_prefix = "al"

    title = models.CharField(max_length=200)
    artists = models.ManyToManyField(
        Artist, through="AlbumArtist", related_name="albums"
    )
    cover = models.ImageField(upload_to="album-covers/", null=True, blank=True)
    cover_seed = models.CharField(max_length=120, blank=True)
    release_date = models.DateField()
    genre = models.CharField(max_length=16, choices=Genre.choices)
    type = models.CharField(
        max_length=8, choices=ReleaseType.choices, default=ReleaseType.ALBUM
    )
    early_access = models.BooleanField(default=False)

    objects = VisibleQuerySet.as_manager()

    class Meta:
        ordering = ["-release_date"]

    def __str__(self):
        return self.title


class Song(PrefixedIDModel, TimeStampedModel):
    id_prefix = "sg"

    title = models.CharField(max_length=200)
    artists = models.ManyToManyField(
        Artist, through="SongArtist", related_name="songs"
    )
    album = models.ForeignKey(
        Album, on_delete=models.CASCADE, null=True, blank=True, related_name="songs"
    )
    track_number = models.PositiveSmallIntegerField(null=True, blank=True)
    cover = models.ImageField(upload_to="song-covers/", null=True, blank=True)
    cover_seed = models.CharField(max_length=120, blank=True)
    audio = models.FileField(upload_to="audio/", null=True, blank=True)
    duration_sec = models.PositiveIntegerField(default=0)
    genre = models.CharField(max_length=16, choices=Genre.choices)
    release_date = models.DateField()
    lyrics = models.TextField(blank=True)
    early_access = models.BooleanField(default=False)

    # Denormalized counters: seedable and incremented on play. The StreamEvent
    # log remains the source of truth for time-bounded aggregates (daily cap,
    # monthly listeners, audit).
    stream_count = models.PositiveIntegerField(default=0)
    listener_count = models.PositiveIntegerField(default=0)

    objects = VisibleQuerySet.as_manager()

    class Meta:
        ordering = ["track_number", "-release_date"]

    def __str__(self):
        return self.title


class SongArtist(models.Model):
    """Through model preserving credit order (primary artist = position 0)."""

    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name="artist_credits")
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name="song_credits")
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(fields=["song", "artist"], name="unique_song_artist")
        ]


class AlbumArtist(models.Model):
    """Through model preserving credit order (primary artist = position 0)."""

    album = models.ForeignKey(Album, on_delete=models.CASCADE, related_name="artist_credits")
    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name="album_credits")
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(fields=["album", "artist"], name="unique_album_artist")
        ]
