"""Playlist API: owner-scoped CRUD with tier limits and song management."""

from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from catalog.models import Song
from common.constants import TIERS

from .models import Playlist, PlaylistItem
from .serializers import PlaylistSerializer


class PlaylistViewSet(viewsets.ModelViewSet):
    """A user's playlists. Creation is capped by subscription tier."""

    serializer_class = PlaylistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Playlist.objects.filter(owner=self.request.user)
            .prefetch_related("items")
        )

    def perform_create(self, serializer):
        limit = TIERS[self.request.user.subscription_tier].playlist_limit
        if limit is not None:
            owned = Playlist.objects.filter(owner=self.request.user).count()
            if owned >= limit:
                raise ValidationError(
                    "به سقف تعداد پلی‌لیست‌های مجاز در اشتراک خود رسیده‌اید."
                )
        serializer.save()

    def _song(self):
        return get_object_or_404(Song, id=self.request.data.get("song_id"))

    def _fresh(self, pk):
        """Re-fetch so the response reflects the just-changed item set (the
        get_object() instance has a stale prefetch cache)."""
        return Playlist.objects.prefetch_related("items").get(pk=pk)

    @action(detail=True, methods=["post"], url_path="add-song")
    def add_song(self, request, pk=None):
        playlist = self.get_object()
        PlaylistItem.objects.get_or_create(
            playlist=playlist, song=self._song(),
            defaults={"position": playlist.items.count()},
        )
        return Response(self.get_serializer(self._fresh(pk)).data)

    @action(detail=True, methods=["post"], url_path="remove-song")
    def remove_song(self, request, pk=None):
        playlist = self.get_object()
        playlist.items.filter(song_id=request.data.get("song_id")).delete()
        return Response(self.get_serializer(self._fresh(pk)).data)
