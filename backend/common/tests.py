"""Unit tests for shared building blocks.

These exercise pure logic directly — no HTTP layer, and no database unless the
behaviour under test is a model concern. They complement the API-level tests in
each app, which cover the same rules end to end.
"""

from types import SimpleNamespace

import pytest
from rest_framework import serializers

from common.constants import TIERS, Genre, Role, SubscriptionTier
from common.models import PrefixedIDModel
from common.permissions import IsAdmin, IsApprovedArtist, IsOwnerOrReadOnly, IsStaff
from common.serializers import GenreField


# --- GenreField ------------------------------------------------------------

class TestGenreField:
    """Bridges stored genre codes and the Persian labels the frontend uses."""

    def setup_method(self):
        self.field = GenreField()

    def test_code_is_rendered_as_persian_label(self):
        assert self.field.to_representation(Genre.POP) == "پاپ"
        assert self.field.to_representation(Genre.HIPHOP) == "هیپ‌هاپ"

    def test_accepts_a_persian_label_on_write(self):
        assert self.field.to_internal_value("پاپ") == Genre.POP

    def test_accepts_a_raw_code_on_write(self):
        assert self.field.to_internal_value("pop") == Genre.POP

    def test_rejects_an_unknown_genre(self):
        with pytest.raises(serializers.ValidationError):
            self.field.to_internal_value("جاز-فضایی")

    def test_write_then_read_round_trips(self):
        for code, label in Genre.choices:
            assert self.field.to_representation(self.field.to_internal_value(label)) == label

    def test_unknown_stored_value_is_passed_through(self):
        """Legacy/invalid rows should not crash serialization."""
        assert self.field.to_representation("mystery") == "mystery"


# --- Tier rules ------------------------------------------------------------

class TestTierBenefits:
    """The tier table is the single source of truth for subscription limits."""

    def test_every_tier_is_defined(self):
        assert set(TIERS) == set(SubscriptionTier.values)

    def test_basic_is_the_only_capped_tier(self):
        assert TIERS[SubscriptionTier.BASIC].daily_stream_limit == 60
        assert TIERS[SubscriptionTier.SILVER].daily_stream_limit is None
        assert TIERS[SubscriptionTier.GOLD].daily_stream_limit is None

    def test_playlist_limits_increase_with_tier(self):
        assert TIERS[SubscriptionTier.BASIC].playlist_limit == 6
        assert TIERS[SubscriptionTier.SILVER].playlist_limit == 100
        assert TIERS[SubscriptionTier.GOLD].playlist_limit is None  # unlimited

    def test_only_gold_gets_early_access_and_stats(self):
        for tier in (SubscriptionTier.BASIC, SubscriptionTier.SILVER):
            assert TIERS[tier].early_access is False
            assert TIERS[tier].can_view_stats is False
        assert TIERS[SubscriptionTier.GOLD].early_access is True
        assert TIERS[SubscriptionTier.GOLD].can_view_stats is True

    def test_paid_tiers_may_upload_an_avatar(self):
        assert TIERS[SubscriptionTier.BASIC].can_upload_avatar is False
        assert TIERS[SubscriptionTier.SILVER].can_upload_avatar is True
        assert TIERS[SubscriptionTier.GOLD].can_upload_avatar is True


# --- Prefixed primary keys -------------------------------------------------

class TestPrefixedIDModel:
    def test_prefix_defaults_are_distinct_per_model(self):
        from accounts.models import Artist, User
        from catalog.models import Album, Song
        from playlists.models import Playlist
        prefixes = [User.id_prefix, Artist.id_prefix, Song.id_prefix,
                    Album.id_prefix, Playlist.id_prefix]
        assert len(set(prefixes)) == len(prefixes), "id prefixes must not collide"

    @pytest.mark.django_db
    def test_save_assigns_a_prefixed_id(self, django_user_model):
        """Ids are readable and typed by prefix, matching the frontend contract."""
        from playlists.models import Playlist
        owner = django_user_model.objects.create_user(
            email="prefix@test.app", password="nava1234", display_name="P"
        )
        first = Playlist.objects.create(owner=owner, name="one")
        second = Playlist.objects.create(owner=owner, name="two")

        assert first.id.startswith("pl_")
        assert second.id.startswith("pl_")
        assert first.id != second.id

    @pytest.mark.django_db
    def test_an_explicit_id_is_preserved(self, django_user_model):
        """The seed relies on this to reuse the exact Phase 1 ids."""
        from playlists.models import Playlist
        owner = django_user_model.objects.create_user(
            email="explicit@test.app", password="nava1234", display_name="P"
        )
        playlist = Playlist.objects.create(id="pl_morning", owner=owner, name="kept")
        assert playlist.id == "pl_morning"


# --- Permission classes ----------------------------------------------------

def _request(role=None, authenticated=True, artist=None, method="GET"):
    """A stand-in for a DRF request — permissions only read these attributes."""
    user = SimpleNamespace(
        is_authenticated=authenticated,
        role=role,
        artist=artist,
        is_platform_staff=role in {Role.SUPPORT, Role.ADMIN},
        is_admin=role == Role.ADMIN,
        id="us_test",
    )
    return SimpleNamespace(user=user, method=method)


class TestPermissionClasses:
    def test_is_admin_allows_only_admin(self):
        perm = IsAdmin()
        assert perm.has_permission(_request(Role.ADMIN), None) is True
        assert perm.has_permission(_request(Role.SUPPORT), None) is False
        assert perm.has_permission(_request(Role.LISTENER), None) is False

    def test_is_staff_allows_support_and_admin(self):
        perm = IsStaff()
        assert perm.has_permission(_request(Role.SUPPORT), None) is True
        assert perm.has_permission(_request(Role.ADMIN), None) is True
        assert perm.has_permission(_request(Role.LISTENER), None) is False

    def test_anonymous_is_always_denied(self):
        for perm in (IsAdmin(), IsStaff()):
            assert perm.has_permission(_request(Role.ADMIN, authenticated=False), None) is False

    def test_approved_artist_required_only_for_writes(self):
        from common.constants import ArtistStatus
        perm = IsApprovedArtist()
        pending = SimpleNamespace(status=ArtistStatus.PENDING)
        approved = SimpleNamespace(status=ArtistStatus.APPROVED)

        # Reads are open to everyone.
        assert perm.has_permission(_request(Role.LISTENER, method="GET"), None) is True
        # Writes need an approved artist profile.
        assert perm.has_permission(
            _request(Role.ARTIST, artist=pending, method="POST"), None) is False
        assert perm.has_permission(
            _request(Role.ARTIST, artist=approved, method="POST"), None) is True
        assert perm.has_permission(
            _request(Role.LISTENER, artist=None, method="POST"), None) is False

    def test_owner_may_write_others_may_only_read(self):
        perm = IsOwnerOrReadOnly()
        obj = SimpleNamespace(owner_id="us_test")
        assert perm.has_object_permission(_request(Role.LISTENER, method="GET"), None, obj) is True
        assert perm.has_object_permission(_request(Role.LISTENER, method="DELETE"), None, obj) is True

        other = SimpleNamespace(owner_id="us_someone_else")
        assert perm.has_object_permission(_request(Role.LISTENER, method="DELETE"), None, other) is False
