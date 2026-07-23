"""Notification and ticket serializers."""

from rest_framework import serializers

from .models import Notification, Ticket, TicketMessage


class NotificationSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(read_only=True)

    class Meta:
        model = Notification
        fields = ["id", "user_id", "kind", "title", "body", "created_at", "read", "href"]


class TicketMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketMessage
        fields = ["id", "author_role", "author_name", "body", "created_at"]


class TicketSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(read_only=True)
    user_name = serializers.CharField(source="user.display_name", read_only=True)
    messages = TicketMessageSerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = ["id", "user_id", "user_name", "subject", "status", "created_at", "messages"]


class TicketCreateSerializer(serializers.Serializer):
    """A listener opens a ticket with an initial message."""

    subject = serializers.CharField(max_length=250)
    body = serializers.CharField()

    def create(self, validated_data):
        from .services import notify_new_ticket

        user = self.context["request"].user
        ticket = Ticket.objects.create(user=user, subject=validated_data["subject"])
        TicketMessage.objects.create(
            ticket=ticket, author_role="user", author_name=user.display_name,
            body=validated_data["body"],
        )
        notify_new_ticket(ticket)
        return ticket

    def to_representation(self, instance):
        return TicketSerializer(instance, context=self.context).data
