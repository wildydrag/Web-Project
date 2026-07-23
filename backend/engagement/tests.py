"""Engagement tests: notification read state and ticket flows."""

import pytest

from common.constants import NotificationKind
from engagement.models import Notification, Ticket

pytestmark = pytest.mark.django_db


def _notify(user, read=False):
    return Notification.objects.create(
        user=user, kind=NotificationKind.NEW_RELEASE, title="t", body="b", read=read
    )


def test_notifications_are_owner_scoped(api, auth, listener, make_user):
    _notify(listener)
    _notify(make_user("other@test.app"))
    assert auth(listener).get("/api/notifications/").json()["count"] == 1


def test_unread_count_and_mark_all_read(api, auth, listener):
    _notify(listener)
    _notify(listener)
    client = auth(listener)
    assert client.get("/api/notifications/unread-count/").json()["count"] == 2
    client.post("/api/notifications/mark-all-read/")
    assert client.get("/api/notifications/unread-count/").json()["count"] == 0


def test_mark_single_notification_read(api, auth, listener):
    n = _notify(listener)
    resp = auth(listener).post(f"/api/notifications/{n.id}/mark-read/")
    assert resp.json()["read"] is True


def test_listener_opens_ticket_and_staff_is_notified(api, auth, listener, support):
    resp = auth(listener).post(
        "/api/tickets/", {"subject": "مشکل", "body": "توضیح مشکل"}, format="json"
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "open"
    assert len(body["messages"]) == 1
    assert Notification.objects.filter(user=support, kind="new_ticket").count() == 1


def test_tickets_owner_scoped_for_listener_all_for_staff(api, auth, listener, support, make_user):
    Ticket.objects.create(user=listener, subject="a")
    Ticket.objects.create(user=make_user("x@test.app"), subject="b")
    assert auth(listener).get("/api/tickets/").json()["count"] == 1
    assert auth(support).get("/api/tickets/").json()["count"] == 2


def test_staff_reply_sets_answered(api, auth, listener, support):
    ticket = Ticket.objects.create(user=listener, subject="a")
    resp = auth(support).post(f"/api/tickets/{ticket.id}/reply/", {"body": "پاسخ"}, format="json")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "answered"
    assert data["messages"][-1]["authorRole"] == "support"


def test_listener_cannot_reply_to_ticket(api, auth, listener):
    ticket = Ticket.objects.create(user=listener, subject="a")
    resp = auth(listener).post(f"/api/tickets/{ticket.id}/reply/", {"body": "x"}, format="json")
    assert resp.status_code == 403
