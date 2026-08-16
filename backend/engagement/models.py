"""Engagement domain: notifications and support tickets."""

from django.db import models

from accounts.models import User
from common.constants import NotificationKind, TicketStatus
from common.models import PrefixedIDModel


class Notification(PrefixedIDModel):
    """Server-generated only (release fan-out, verdicts, ticket/artist events)."""

    id_prefix = "nt"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=32, choices=NotificationKind.choices)
    title = models.CharField(max_length=200)
    body = models.TextField(blank=True)
    href = models.CharField(max_length=300, blank=True)
    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.kind} → {self.user_id}"


class Ticket(PrefixedIDModel):
    """Support ticket. Human-readable ids like ``TK-1042`` are seeded; new
    tickets get the standard ``tk_<random>`` prefix from the base model."""

    id_prefix = "tk"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="tickets")
    subject = models.CharField(max_length=250)
    status = models.CharField(
        max_length=16, choices=TicketStatus.choices, default=TicketStatus.OPEN
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.id} · {self.subject}"


class TicketMessage(models.Model):
    AUTHOR_CHOICES = [("user", "کاربر"), ("support", "پشتیبان")]

    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="messages")
    author_role = models.CharField(max_length=8, choices=AUTHOR_CHOICES)
    author_name = models.CharField(max_length=120)
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"msg<{self.ticket_id}>"
