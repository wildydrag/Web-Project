"""Catalog serializers: read shapes matching types.ts, plus publish/edit."""

import secrets

from rest_framework import serializers

from accounts.models import Artist
from common.constants import TIERS, ArtistStatus, ReleaseType, SubscriptionTier
from common.serializers import GenreField, GenreListField
from engagement.services import notify_new_release

from .models import Album, AlbumArtist, Song, SongArtist


def _abs_url(file, context):
    if not file:
        return None
    request = context.get("request")
    return request.build_absolute_uri(file.url) if request else file.url


# --- Read serializers ------------------------------------------------------

class ArtistSerializer(serializers.ModelSerializer):
    """Public artist. Analytics (followerCount/monthlyListeners/totalStreams)
    are gold-gated — dropped for viewers who lack ``can_view_stats`` (unless
    staff or the artist's own account)."""

    genres = GenreListField()
    avatar_url = serializers.SerializerMethodField()
    user_id = serializers.CharField(read_only=True)
    requested_at = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = Artist
        fields = [
            "id", "user_id", "name", "bio", "avatar_url", "avatar_seed", "genres",
            "verified", "status", "rejection_reason", "portfolio", "requested_at",
            "follower_count", "monthly_listeners", "total_streams",
        ]

    def get_avatar_url(self, obj):
        return _abs_url(obj.avatar, self.context)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self._can_view_stats(instance):
            for field in ("follower_count", "monthly_listeners", "total_streams"):
                data.pop(field, None)
        return data

    def _can_view_stats(self, artist) -> bool:
        user = getattr(self.context.get("request"), "user", None)
        if not user or not user.is_authenticated:
            return False
        if user.is_platform_staff or artist.user_id == user.id:
            return True
        return TIERS[user.subscription_tier].can_view_stats


class SongSerializer(serializers.ModelSerializer):
    artist_ids = serializers.SerializerMethodField()
    genre = GenreField(read_only=True)
    cover_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()

    class Meta:
        model = Song
        fields = [
            "id", "title", "artist_ids", "album_id", "cover_seed", "cover_url",
            "audio_url", "duration_sec", "genre", "release_date", "lyrics",
            "stream_count", "listener_count", "early_access",
        ]

    def get_artist_ids(self, obj) -> list[str]:
        return [c.artist_id for c in obj.artist_credits.all()]

    def get_cover_url(self, obj):
        return _abs_url(obj.cover, self.context)

    def get_audio_url(self, obj):
        return _abs_url(obj.audio, self.context)


class AlbumSerializer(serializers.ModelSerializer):
    artist_ids = serializers.SerializerMethodField()
    song_ids = serializers.SerializerMethodField()
    genre = GenreField(read_only=True)
    cover_url = serializers.SerializerMethodField()
    stream_count = serializers.SerializerMethodField()
    listener_count = serializers.SerializerMethodField()

    class Meta:
        model = Album
        fields = [
            "id", "title", "artist_ids", "cover_seed", "cover_url", "release_date",
            "genre", "type", "song_ids", "stream_count", "listener_count", "early_access",
        ]

    def get_artist_ids(self, obj) -> list[str]:
        return [c.artist_id for c in obj.artist_credits.all()]

    def get_song_ids(self, obj) -> list[str]:
        return [s.id for s in obj.songs.all()]

    def get_stream_count(self, obj) -> int:
        return sum(s.stream_count for s in obj.songs.all())

    def get_listener_count(self, obj) -> int:
        return round(self.get_stream_count(obj) * 0.3)

    def get_cover_url(self, obj):
        return _abs_url(obj.cover, self.context)


# --- Write serializers (artist studio) -------------------------------------

class _CreditMixin:
    """Shared credit-writing: primary artist first, collaborators after."""

    def _write_credits(self, through_model, key, obj, primary, collaborator_ids):
        through_model.objects.create(**{key: obj, "artist": primary, "position": 0})
        for pos, artist in enumerate(self._collaborators(collaborator_ids), start=1):
            through_model.objects.create(**{key: obj, "artist": artist, "position": pos})

    def _collaborators(self, ids):
        return list(
            Artist.objects.filter(id__in=ids or [], status=ArtistStatus.APPROVED)
        )


class SongWriteSerializer(_CreditMixin, serializers.Serializer):
    """Publish a standalone single (studio)."""

    title = serializers.CharField(max_length=200)
    genre = GenreField()
    duration_sec = serializers.IntegerField(min_value=1)
    release_date = serializers.DateField()
    lyrics = serializers.CharField(required=False, allow_blank=True, default="")
    collaborator_ids = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    audio = serializers.FileField(required=False, allow_null=True)
    cover = serializers.ImageField(required=False, allow_null=True)

    def create(self, validated_data):
        primary = self.context["request"].user.artist
        collaborator_ids = validated_data.pop("collaborator_ids", [])
        song = Song.objects.create(
            title=validated_data["title"], genre=validated_data["genre"],
            duration_sec=validated_data["duration_sec"],
            release_date=validated_data["release_date"],
            lyrics=validated_data.get("lyrics", ""),
            audio=validated_data.get("audio"), cover=validated_data.get("cover"),
            cover_seed=f"single-{secrets.token_hex(3)}", early_access=False,
        )
        self._write_credits(SongArtist, "song", song, primary, collaborator_ids)
        notify_new_release(primary, title=song.title, href="/library")
        return song

    def to_representation(self, instance):
        return SongSerializer(instance, context=self.context).data


class AlbumTrackSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200)
    duration_sec = serializers.IntegerField(min_value=1)
    lyrics = serializers.CharField(required=False, allow_blank=True, default="")


class AlbumWriteSerializer(_CreditMixin, serializers.Serializer):
    """Publish an album with its tracks (studio)."""

    title = serializers.CharField(max_length=200)
    genre = GenreField()
    release_date = serializers.DateField()
    collaborator_ids = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    cover = serializers.ImageField(required=False, allow_null=True)
    tracks = AlbumTrackSerializer(many=True)

    def validate_tracks(self, value):
        if not value:
            raise serializers.ValidationError("آلبوم باید حداقل یک آهنگ داشته باشد.")
        return value

    def create(self, validated_data):
        primary = self.context["request"].user.artist
        collaborator_ids = validated_data.pop("collaborator_ids", [])
        tracks = validated_data.pop("tracks")
        album = Album.objects.create(
            title=validated_data["title"], genre=validated_data["genre"],
            release_date=validated_data["release_date"], type=ReleaseType.ALBUM,
            cover=validated_data.get("cover"), cover_seed=f"al-{secrets.token_hex(3)}",
        )
        self._write_credits(AlbumArtist, "album", album, primary, collaborator_ids)
        for track_number, track in enumerate(tracks, start=1):
            song = Song.objects.create(
                album=album, title=track["title"], genre=validated_data["genre"],
                duration_sec=track["duration_sec"], release_date=validated_data["release_date"],
                lyrics=track.get("lyrics", ""), track_number=track_number,
                cover_seed=album.id, early_access=False,
            )
            self._write_credits(SongArtist, "song", song, primary, collaborator_ids)
        notify_new_release(primary, title=album.title, href=f"/album/{album.id}")
        return album

    def to_representation(self, instance):
        return AlbumSerializer(instance, context=self.context).data


class SongUpdateSerializer(serializers.ModelSerializer):
    """Owner edits to an existing song (title/lyrics/audio/cover)."""

    class Meta:
        model = Song
        fields = ["title", "lyrics", "audio", "cover"]

    def to_representation(self, instance):
        return SongSerializer(instance, context=self.context).data


class AlbumUpdateSerializer(serializers.ModelSerializer):
    """Owner edits to album metadata (title/cover)."""

    class Meta:
        model = Album
        fields = ["title", "cover"]

    def to_representation(self, instance):
        return AlbumSerializer(instance, context=self.context).data
