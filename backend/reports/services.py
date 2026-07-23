"""Streaming + reporting services.

Aggregates are computed here with the ORM (Count/Sum) and returned as numbers —
never as raw object lists for the frontend to reduce (spec §7.3).
"""

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
    limit = TIERS[user.subscription_tier].daily_stream_limit
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
