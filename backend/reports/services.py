"""Streaming + reporting services.

Aggregates are computed here with the ORM (Count/Sum) and returned as numbers —
never as raw object lists for the frontend to reduce (spec §7.3).
"""

from datetime import datetime

from django.db.models import Count, F
from django.utils import timezone

from accounts.models import Artist, User
from catalog.models import Song
from common.constants import (
    ArtistStatus,
    PayoutStatus,
    Role,
    SubscriptionTier,
    TIERS,
)
from subscriptions.models import PlatformSettings

from .models import Payout, StreamEvent


class StreamCapReached(Exception):
    """Raised when a basic-tier user hits the daily stream limit."""


def record_stream(user, song) -> dict:
    """Record a play, enforcing the tier's daily cap (counted from the log, so
    no nightly reset job is needed). Returns the updated daily figures."""
    today_count = StreamEvent.objects.filter(
        user=user, created_at__date=timezone.localdate()
    ).count()
    limit = TIERS[user.current_tier].daily_stream_limit
    if limit is not None and today_count >= limit:
        raise StreamCapReached()

    StreamEvent.objects.create(user=user, song=song)
    Song.objects.filter(pk=song.pk).update(stream_count=F("stream_count") + 1)
    remaining = None if limit is None else max(0, limit - today_count - 1)
    return {"daily_streams": today_count + 1, "remaining": remaining}


def dashboard_overview(user) -> dict:
    """Counts for the staff dashboard landing (revenue/users are admin-only)."""
    data = {
        "open_tickets": _open_ticket_count(),
        "pending_artists": Artist.objects.filter(status=ArtistStatus.PENDING).count(),
    }
    if user.is_admin:
        data["total_users"] = User.objects.count()
        data["monthly_revenue"] = _monthly_revenue()
    return data


def subscription_report() -> dict:
    """Tier distribution + revenue for the admin subscriptions dashboard."""
    subscribers = User.objects.filter(role__in=[Role.LISTENER, Role.ARTIST])
    counts = {tier: 0 for tier in SubscriptionTier.values}
    for row in subscribers.values("subscription_tier").annotate(n=Count("id")):
        counts[row["subscription_tier"]] = row["n"]
    settings = PlatformSettings.load()
    revenue = counts[SubscriptionTier.SILVER] * settings.silver_price \
        + counts[SubscriptionTier.GOLD] * settings.gold_price
    return {
        "counts": counts,
        "total_subscribers": subscribers.count(),
        "monthly_revenue": revenue,
        "prices": {"silver": settings.silver_price, "gold": settings.gold_price},
    }


def pending_artist_applications() -> list[dict]:
    """Pending artists joined to applicant email (avoids an N+1 on the client)."""
    pending = (
        Artist.objects.filter(status=ArtistStatus.PENDING)
        .select_related("user")
        .order_by("created_at")
    )
    return [
        {
            "id": a.id,
            "name": a.name,
            "email": a.user.email,
            "requested_at": a.created_at,
            "portfolio": a.portfolio,
        }
        for a in pending
    ]


def settle_payout(payout: Payout) -> Payout:
    payout.status = PayoutStatus.SETTLED
    payout.save(update_fields=["status"])
    return payout


# --- Artist payouts --------------------------------------------------------

def period_bounds(period: str) -> tuple:
    """Start (inclusive) and end (exclusive) datetimes for a ``YYYY-MM`` period.

    Periods are Gregorian year-month keys interpreted in the project timezone,
    so a month boundary lines up with local midnight rather than UTC.
    """
    year, month = (int(part) for part in period.split("-"))
    start = timezone.make_aware(datetime(year, month, 1))
    end_year, end_month = (year + 1, 1) if month == 12 else (year, month + 1)
    end = timezone.make_aware(datetime(end_year, end_month, 1))
    return start, end


def artist_metrics(artist, start, end) -> dict:
    """Streams and unique listeners for one artist's catalogue in a period.

    Both come from the :class:`~reports.models.StreamEvent` log, so the audit
    table reflects real listening rather than a stored estimate.
    """
    events = StreamEvent.objects.filter(
        song__artists=artist, created_at__gte=start, created_at__lt=end
    )
    return {
        "total_streams": events.count(),
        "unique_listeners": events.values("user").distinct().count(),
    }


def reward_for(total_streams: int, unique_listeners: int, settings=None) -> int:
    """The payout formula, in Toman.

    A per-stream rate rewards volume and a per-listener rate rewards reach, so
    an artist played many times by few people is not paid the same as one heard
    by a wide audience. Both rates live in :class:`PlatformSettings` and are
    admin-editable, so tuning the payout needs no code change.
    """
    settings = settings or PlatformSettings.load()
    return (
        total_streams * settings.payout_per_stream
        + unique_listeners * settings.payout_per_listener
    )


def recalculate_payouts(period: str) -> list[Payout]:
    """Rebuild every approved artist's payout row for ``period``.

    Idempotent: re-running refreshes the figures. Rows already marked settled
    keep that status so a recalculation cannot un-pay an artist.
    """
    start, end = period_bounds(period)
    settings = PlatformSettings.load()
    rows = []
    for artist in Artist.objects.filter(status=ArtistStatus.APPROVED):
        metrics = artist_metrics(artist, start, end)
        payout, _ = Payout.objects.update_or_create(
            artist=artist,
            period=period,
            defaults={
                "total_streams": metrics["total_streams"],
                "unique_listeners": metrics["unique_listeners"],
                "reward_toman": reward_for(
                    metrics["total_streams"], metrics["unique_listeners"], settings
                ),
            },
        )
        rows.append(payout)
    return rows


# --- internals -------------------------------------------------------------

def _open_ticket_count() -> int:
    from engagement.models import Ticket  # local import avoids app-load cycle
    from common.constants import TicketStatus
    return Ticket.objects.filter(status=TicketStatus.OPEN).count()


def _monthly_revenue() -> int:
    settings = PlatformSettings.load()
    subscribers = User.objects.filter(role__in=[Role.LISTENER, Role.ARTIST])
    silver = subscribers.filter(subscription_tier=SubscriptionTier.SILVER).count()
    gold = subscribers.filter(subscription_tier=SubscriptionTier.GOLD).count()
    return silver * settings.silver_price + gold * settings.gold_price
