"""Reporting domain: the stream log and monthly artist payouts."""

from django.db import models

from accounts.models import Artist, User
from catalog.models import Song
from common.constants import PayoutStatus
from common.models import PrefixedIDModel


class StreamEvent(models.Model):
    """
    One recorded play. This single log powers three things the Phase 1 mock
    faked separately: the basic-tier daily cap (count today, timezone-aware — no
    reset job needed), catalog/artist stream aggregates, and the monthly audit's
    unique-listener / total-stream figures.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="stream_events")
    song = models.ForeignKey(Song, on_delete=models.CASCADE, related_name="stream_events")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["song", "created_at"]),
        ]

    def __str__(self):
        return f"{self.user_id} ▶ {self.song_id}"


class Payout(PrefixedIDModel):
    """
    Monthly artist-payout snapshot (admin auditing table). Metrics are computed
    from :class:`StreamEvent` for the period; ``status`` tracks settlement.
    """

    id_prefix = "au"

    artist = models.ForeignKey(Artist, on_delete=models.CASCADE, related_name="payouts")
    period = models.CharField(max_length=16, help_text="year-month key, e.g. 1405-03")
    unique_listeners = models.PositiveIntegerField(default=0)
    total_streams = models.PositiveIntegerField(default=0)
    reward_toman = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=16, choices=PayoutStatus.choices, default=PayoutStatus.PENDING
    )

    class Meta:
        ordering = ["artist__name"]
        constraints = [
            models.UniqueConstraint(fields=["artist", "period"], name="unique_artist_period")
        ]

    def __str__(self):
        return f"{self.artist_id} · {self.period}"
