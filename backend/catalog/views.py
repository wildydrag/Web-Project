"""Catalog API: artists (+ verification), songs, albums."""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import Artist
from common.constants import ArtistStatus
from common.permissions import IsApprovedArtist, IsCreditedArtistOrReadOnly, IsStaff
from engagement.services import notify_artist_verdict

from .models import Album, Song
from .serializers import (
    AlbumSerializer,
    AlbumUpdateSerializer,
    AlbumWriteSerializer,
    ArtistSerializer,
    SongSerializer,
    SongUpdateSerializer,
    SongWriteSerializer,
)

_SONG_PREFETCH = ("artist_credits",)
_ALBUM_PREFETCH = ("artist_credits", "songs")


class ArtistViewSet(viewsets.ReadOnlyModelViewSet):
    """Read artists; staff verification actions; per-artist catalog subsets."""

    serializer_class = ArtistSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Artist.objects.select_related("user")
        status_param = self.request.query_params.get("status")
        if status_param:
            if not self.request.user.is_platform_staff:
                return qs.filter(status=ArtistStatus.APPROVED).none()
            return qs.filter(status=status_param)
        return qs

    @action(detail=True, methods=["get"])
    def albums(self, request, pk=None):
        qs = Album.objects.filter(artists=pk).prefetch_related(*_ALBUM_PREFETCH).visible_to(request.user)
        return Response(AlbumSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def singles(self, request, pk=None):
        qs = (Song.objects.filter(artists=pk, album__isnull=True)
              .prefetch_related(*_SONG_PREFETCH).visible_to(request.user))
        return Response(SongSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["get"])
    def songs(self, request, pk=None):
        qs = (Song.objects.filter(artists=pk)
              .prefetch_related(*_SONG_PREFETCH).visible_to(request.user))
        return Response(SongSerializer(qs, many=True, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[IsStaff])
    def approve(self, request, pk=None):
        artist = self.get_object()
        artist.status = ArtistStatus.APPROVED
        artist.verified = True
        artist.rejection_reason = ""
        artist.save(update_fields=["status", "verified", "rejection_reason"])
        notify_artist_verdict(artist, approved=True)
        return Response(self.get_serializer(artist).data)

    @action(detail=True, methods=["post"], permission_classes=[IsStaff])
    def reject(self, request, pk=None):
        reason = (request.data.get("reason") or "").strip()
        if not reason:
            raise ValidationError({"reason": "دلیل رد درخواست الزامی است."})
        artist = self.get_object()
        artist.status = ArtistStatus.REJECTED
        artist.verified = False
        artist.rejection_reason = reason
        artist.save(update_fields=["status", "verified", "rejection_reason"])
        notify_artist_verdict(artist, approved=False, reason=reason)
        return Response(self.get_serializer(artist).data)


class _OwnedCatalogMixin:
    """Shared write-permission wiring for song/album viewsets."""

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsAuthenticated(), IsApprovedArtist(), IsCreditedArtistOrReadOnly()]
        return [IsAuthenticated()]

    def _mine(self):
        return str(self.request.query_params.get("mine", "")).lower() in {"1", "true"}


class SongViewSet(_OwnedCatalogMixin, viewsets.ModelViewSet):
    search_fields = ["title"]
    ordering_fields = ["stream_count", "release_date"]
    ordering = ["-release_date"]

    def get_queryset(self):
        base = Song.objects.prefetch_related(*_SONG_PREFETCH)
        artist = getattr(self.request.user, "artist", None)
        if self.action in ("update", "partial_update", "destroy"):
            return base.filter(artists=artist) if artist else base.none()
        if self._mine():
            return base.filter(artists=artist) if artist else base.none()
        return base.visible_to(self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return SongWriteSerializer
        if self.action in ("update", "partial_update"):
            return SongUpdateSerializer
        return SongSerializer

    @action(detail=True, methods=["post"])
    def play(self, request, pk=None):
        """Record a stream, enforcing the tier's daily cap (server-side)."""
        from reports.services import StreamCapReached, record_stream

        song = self.get_object()  # visibility-scoped: early-access stays hidden
        try:
            result = record_stream(request.user, song)
        except StreamCapReached:
            return Response(
                {"detail": "به سقف استریم روزانه رسیدید. برای استریم نامحدود، اشتراک خود را ارتقا دهید."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return Response(result)


class AlbumViewSet(_OwnedCatalogMixin, viewsets.ModelViewSet):
    search_fields = ["title"]
    ordering_fields = ["release_date"]
    ordering = ["-release_date"]

    def get_queryset(self):
        base = Album.objects.prefetch_related(*_ALBUM_PREFETCH)
        artist = getattr(self.request.user, "artist", None)
        if self.action in ("update", "partial_update", "destroy"):
            return base.filter(artists=artist) if artist else base.none()
        if self._mine():
            return base.filter(artists=artist) if artist else base.none()
        return base.visible_to(self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return AlbumWriteSerializer
        if self.action in ("update", "partial_update"):
            return AlbumUpdateSerializer
        return AlbumSerializer
