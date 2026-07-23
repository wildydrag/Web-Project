"""Reporting API: home/library feeds and the staff/admin dashboards.

All counts and sums are computed server-side; endpoints return numbers, not raw
lists for the client to reduce.
"""

from django.db.models import Q
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Album, Song
from catalog.serializers import AlbumSerializer, SongSerializer
from common.constants import SubscriptionTier
from common.permissions import IsAdmin, IsStaff
from playlists.models import Playlist
from playlists.serializers import PlaylistSerializer

from .models import Payout
from .serializers import PayoutSerializer
from .services import (
    dashboard_overview,
    pending_artist_applications,
    settle_payout,
    subscription_report,
)

_ALBUM_PREFETCH = ("artist_credits", "songs")
_SONG_PREFETCH = ("artist_credits",)


class HomeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        ctx = {"request": request}
        playlists = (Playlist.objects.filter(owner=user)
                     .prefetch_related("items").order_by("-created_at")[:5])
        albums = (Album.objects.prefetch_related(*_ALBUM_PREFETCH)
                  .visible_to(user).order_by("-release_date")[:5])
        top_songs = (Song.objects.prefetch_related(*_SONG_PREFETCH)
                     .visible_to(user).order_by("-stream_count")[:5])
        data = {
            "recent_playlists": PlaylistSerializer(playlists, many=True, context=ctx).data,
            "recent_albums": AlbumSerializer(albums, many=True, context=ctx).data,
            "top_songs": SongSerializer(top_songs, many=True, context=ctx).data,
            "early_access": self._early_access(user, ctx),
        }
        return Response(data)

    def _early_access(self, user, ctx):
        if user.subscription_tier != SubscriptionTier.GOLD:
            return {"albums": [], "singles": []}
        albums = (Album.objects.filter(early_access=True)
                  .prefetch_related(*_ALBUM_PREFETCH))
        singles = (Song.objects.filter(early_access=True, album__isnull=True)
                   .prefetch_related(*_SONG_PREFETCH))
        return {
            "albums": AlbumSerializer(albums, many=True, context=ctx).data,
            "singles": SongSerializer(singles, many=True, context=ctx).data,
        }


class LibraryView(APIView):
    """Unified album+single feed with server-side search/sort and visibility."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        ctx = {"request": request}
        query = request.query_params.get("q", "").strip()
        sort = request.query_params.get("sort", "date")
        text = (Q(title__icontains=query) | Q(artists__name__icontains=query)) if query else Q()

        albums = (Album.objects.visible_to(user).filter(text)
                  .prefetch_related(*_ALBUM_PREFETCH).distinct())
        singles = (Song.objects.filter(album__isnull=True).visible_to(user).filter(text)
                   .prefetch_related(*_SONG_PREFETCH).distinct())

        items = []
        for album in albums:
            streams = sum(s.stream_count for s in album.songs.all())
            items.append({
                "kind": "album", "title": album.title, "streams": streams,
                "sort_date": album.release_date,
                "album": AlbumSerializer(album, context=ctx).data,
            })
        for single in singles:
            items.append({
                "kind": "single", "title": single.title, "streams": single.stream_count,
                "sort_date": single.release_date,
                "song": SongSerializer(single, context=ctx).data,
            })

        key = "streams" if sort == "streams" else "sort_date"
        items.sort(key=lambda item: item[key], reverse=True)
        return Response(items)


class DashboardOverviewView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        return Response(dashboard_overview(request.user))


class DashboardSubscriptionsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(subscription_report())


class DashboardApprovalsView(APIView):
    permission_classes = [IsStaff]

    def get(self, request):
        return Response(pending_artist_applications())


class PayoutViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Monthly artist payouts (admin auditing table) + settle action."""

    permission_classes = [IsAdmin]
    serializer_class = PayoutSerializer

    def get_queryset(self):
        qs = Payout.objects.select_related("artist")
        period = self.request.query_params.get("period")
        return qs.filter(period=period) if period else qs

    @action(detail=True, methods=["post"])
    def settle(self, request, pk=None):
        payout = settle_payout(self.get_object())
        return Response(self.get_serializer(payout).data)
