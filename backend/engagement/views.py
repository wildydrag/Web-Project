"""Engagement API: notifications (list/read/delete) and support tickets."""

from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from common.constants import TicketStatus
from common.permissions import IsStaff

from .models import Notification, Ticket, TicketMessage
from .serializers import (
    NotificationSerializer,
    TicketCreateSerializer,
    TicketSerializer,
)


class NotificationViewSet(mixins.ListModelMixin, mixins.DestroyModelMixin,
                          viewsets.GenericViewSet):
    """Own notifications only. No create (server-generated); no PUT."""

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.read = True
        notification.save(update_fields=["read"])
        return Response(self.get_serializer(notification).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request):
        self.get_queryset().update(read=True)
        return Response({"status": "ok"})

    @action(detail=False, methods=["get"], url_path="unread-count")
    def unread_count(self, request):
        return Response({"count": self.get_queryset().filter(read=False).count()})


class TicketViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                    mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Listeners open/list their own tickets; staff see all and respond."""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Ticket.objects.select_related("user").prefetch_related("messages")
        if self.request.user.is_platform_staff:
            return qs
        return qs.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == "create":
            return TicketCreateSerializer
        return TicketSerializer

    def _fresh(self, pk):
        """Re-fetch with messages so the response reflects just-added replies
        (the get_object() instance has a stale prefetch cache)."""
        return (
            Ticket.objects.select_related("user").prefetch_related("messages").get(pk=pk)
        )

    @action(detail=True, methods=["post"], permission_classes=[IsStaff])
    def reply(self, request, pk=None):
        ticket = self.get_object()
        body = (request.data.get("body") or "").strip()
        if not body:
            raise ValidationError({"body": "متن پاسخ الزامی است."})
        TicketMessage.objects.create(
            ticket=ticket, author_role="support",
            author_name=request.user.display_name, body=body,
        )
        ticket.status = TicketStatus.ANSWERED
        ticket.save(update_fields=["status"])
        return Response(TicketSerializer(self._fresh(pk), context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[IsStaff], url_path="set-status")
    def set_status(self, request, pk=None):
        ticket = self.get_object()
        new_status = request.data.get("status")
        if new_status not in TicketStatus.values:
            raise ValidationError({"status": "وضعیت نامعتبر است."})
        ticket.status = new_status
        ticket.save(update_fields=["status"])
        return Response(TicketSerializer(self._fresh(pk), context={"request": request}).data)
