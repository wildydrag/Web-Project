"""
Notification fan-out helpers — the server-side equivalent of the Phase 1 store
side effects (staff alerts on artist requests, verdicts, release fan-out).

These centralize *who* gets notified for each domain event so views/serializers
stay focused on their own concern.
"""

from accounts.models import User
from common.constants import NotificationKind, Role

from .models import Notification


def _notify(user, *, kind, title, body="", href=""):
    return Notification.objects.create(
        user=user, kind=kind, title=title, body=body, href=href
    )


def notify_staff_new_artist(artist):
    """Alert every support/admin that a new artist application arrived."""
    for staff in User.objects.filter(role__in=[Role.SUPPORT, Role.ADMIN]):
        _notify(
            staff,
            kind=NotificationKind.NEW_ARTIST_REQUEST,
            title="درخواست احراز هویت جدید",
            body=f"{artist.name} درخواست حساب هنرمند ثبت کرد.",
            href="/dashboard/approvals",
        )


def notify_artist_verdict(artist, *, approved, reason=""):
    if approved:
        _notify(
            artist.user,
            kind=NotificationKind.ARTIST_VERDICT,
            title="حساب هنرمندی شما تایید شد",
            body="اکنون می‌توانید آثار خود را منتشر کنید.",
            href="/studio",
        )
    else:
        _notify(
            artist.user,
            kind=NotificationKind.ARTIST_VERDICT,
            title="درخواست هنرمندی شما رد شد",
            body=f"دلیل: {reason}",
        )


def notify_new_release(artist, *, title, href):
    """Fan a new-release notification out to the artist's followers."""
    followers = User.objects.filter(following_links__artist=artist)
    for follower in followers:
        _notify(
            follower,
            kind=NotificationKind.NEW_RELEASE,
            title=f"اثر جدید از {artist.name}",
            body=f"«{title}» منتشر شد.",
            href=href,
        )


def notify_new_ticket(ticket):
    for staff in User.objects.filter(role__in=[Role.SUPPORT, Role.ADMIN]):
        _notify(
            staff,
            kind=NotificationKind.NEW_TICKET,
            title=f"تیکت جدید: {ticket.subject}",
            body=f"{ticket.user.display_name} یک تیکت پشتیبانی ثبت کرد.",
            href="/dashboard/tickets",
        )
