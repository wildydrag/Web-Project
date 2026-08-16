"""Reusable abstract base models shared across apps."""

import secrets

from django.db import models


class PrefixedIDModel(models.Model):
    """
    Primary key is a readable, opaque string like ``sg_a1b2c3d4``.

    This mirrors the Phase 1 frontend contract (``types.ts`` ids are strings such
    as ``us_basic``/``sg_01``) so serialized ids stay string-typed and the seed
    can reuse the exact Phase 1 ids. New rows get ``<prefix>_<random>``.
    """

    id_prefix = "obj"

    id = models.CharField(primary_key=True, max_length=40, editable=False)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        if not self.id:
            self.id = f"{self.id_prefix}_{secrets.token_hex(4)}"
        super().save(*args, **kwargs)


class TimeStampedModel(models.Model):
    """Adds self-managed ``created_at`` / ``updated_at`` timestamps."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
