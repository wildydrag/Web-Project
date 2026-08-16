"""Playlist domain: user-owned playlists and their ordered songs."""

from django.db import models

from accounts.models import User
from catalog.models import Song
from common.models import PrefixedIDModel


class Playlist(PrefixedIDModel):
    id_prefix = "pl"

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="playlists")
    name = models.CharField(max_length=200)
    cover = models.ImageField(upload_to="playlist-covers/", null=True, blank=True)
    cover_seed = models.CharField(max_length=120, blank=True)
    songs = models.ManyToManyField(Song, through="PlaylistItem", related_name="playlists")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class PlaylistItem(models.Model):
    """Through model preserving song order within a playlist."""

    playlist = models.ForeignKey(Playlist, on_delete=models.CASCADE, related_name="items")
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name="playlist_items")
    position = models.PositiveIntegerField(default=0)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position"]
        constraints = [
            models.UniqueConstraint(
                fields=["playlist", "song"], name="unique_playlist_song"
            )
        ]
