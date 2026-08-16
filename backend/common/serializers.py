"""Reusable serializer fields shared across apps."""

from rest_framework import serializers

from common.constants import Genre


def absolute_file_url(file, context):
    """Absolute URL for a File/Image field, or None. Uses the request in
    ``context`` to build a fully-qualified URL the frontend can load directly."""
    if not file:
        return None
    request = context.get("request")
    return request.build_absolute_uri(file.url) if request else file.url


class GenreField(serializers.Field):
    """
    Bridges the stored genre *code* (e.g. ``pop``) and the Persian *label*
    (e.g. ``پاپ``) the frontend contract uses. Reads emit the label; writes
    accept either the label or the code.
    """

    def to_representation(self, value):
        try:
            return Genre(value).label
        except ValueError:
            return value

    def to_internal_value(self, data):
        for code, label in Genre.choices:
            if data == code or data == label:
                return code
        raise serializers.ValidationError("ژانر نامعتبر است.")


class GenreListField(serializers.ListField):
    child = GenreField()
