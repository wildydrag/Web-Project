"""Reporting serializers (payout/audit rows)."""

from rest_framework import serializers

from .models import Payout


class PayoutSerializer(serializers.ModelSerializer):
    artist_id = serializers.CharField(read_only=True)
    artist_name = serializers.CharField(source="artist.name", read_only=True)

    class Meta:
        model = Payout
        fields = [
            "id", "artist_id", "artist_name", "period",
            "unique_listeners", "total_streams", "reward_toman", "status",
        ]
