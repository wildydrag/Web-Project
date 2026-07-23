"""
Reusable DRF permission classes — the server-side enforcement of the role and
subscription matrix that Phase 1 only checked (bypassably) on the client.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission

from common.constants import ArtistStatus, Role


class IsAdmin(BasePermission):
    """Admin only (pricing, auditing, payouts)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.role == Role.ADMIN)


class IsStaff(BasePermission):
    """Support or admin — the dashboard audience (admin ⊃ support)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_platform_staff)


class IsListenerOrArtist(BasePermission):
    """The end-user app audience (artists can listen too)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.role in {Role.LISTENER, Role.ARTIST}
        )


class IsApprovedArtist(BasePermission):
    """Write access to the studio requires an approved artist profile."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        user = request.user
        artist = getattr(user, "artist", None)
        return bool(
            user
            and user.is_authenticated
            and user.role == Role.ARTIST
            and artist is not None
            and artist.status == ArtistStatus.APPROVED
        )


class IsCreditedArtistOrReadOnly(BasePermission):
    """Object-level (Song/Album): read for all; mutate only if the requesting
    user's artist profile is among the credited artists."""

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        artist = getattr(request.user, "artist", None)
        return bool(artist and obj.artists.filter(id=artist.id).exists())


class IsOwnerOrReadOnly(BasePermission):
    """Object-level: anyone may read; only the owner may modify.

    ``owner_field`` names the FK to the owning user (default ``owner``).
    """

    owner_field = "owner"

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        owner_id = getattr(obj, f"{self.owner_field}_id", None)
        return owner_id == request.user.id
