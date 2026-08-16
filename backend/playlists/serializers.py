"""Playlist serializers."""

import secrets

from rest_framework import serializers

from common.serializers import absolute_file_url

from .models import Playlist


class PlaylistSerializer(serializers.ModelSerializer):
    owner_id = serializers.CharField(read_only=True)
    song_ids = serializers.SerializerMethodField()
    cover_url = serializers.SerializerMethodField()

    class Meta:
        model = Playlist
        fields = ["id", "owner_id", "name", "cover_seed", "cover_url", "song_ids", "created_at"]
        read_only_fields = ["cover_seed", "created_at"]

    def get_song_ids(self, obj) -> list[str]:
        return [item.song_id for item in obj.items.all()]

    def get_cover_url(self, obj):
        return absolute_file_url(obj.cover, self.context)

    def create(self, validated_data):
        return Playlist.objects.create(
            owner=self.context["request"].user,
            name=validated_data["name"],
            cover_seed=f"pl-{secrets.token_hex(3)}",
        )
