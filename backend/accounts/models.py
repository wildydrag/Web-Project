"""Account domain: users, per-user preferences, artist profiles, follows."""

import secrets

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from common.constants import (
    ArtistStatus,
    Gender,
    Language,
    Role,
    SubscriptionTier,
)
from common.models import PrefixedIDModel, TimeStampedModel


class UserManager(BaseUserManager):
    """Email-based manager (there is no separate login username)."""

    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Users must have an email address.")
        user = self.model(email=self.normalize_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("role", Role.ADMIN)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        return self.create_user(email, password, **extra_fields)


class User(PrefixedIDModel, AbstractBaseUser, PermissionsMixin):
    """
    Custom account. ``email`` is the login identifier; ``username`` is a
    system-assigned handle (e.g. ``@nava_1042``), distinct from ``display_name``.
    """

    id_prefix = "us"

    email = models.EmailField(unique=True)
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.LISTENER)
    display_name = models.CharField(max_length=120)
    username = models.CharField(max_length=40, unique=True, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    avatar_seed = models.CharField(max_length=120, blank=True)
    gender = models.CharField(max_length=16, choices=Gender.choices, default=Gender.UNSPECIFIED)
    birth_date = models.DateField(null=True, blank=True)

    subscription_tier = models.CharField(
        max_length=16, choices=SubscriptionTier.choices, default=SubscriptionTier.BASIC
    )
    subscription_renews_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    # Django-admin / permissions flags (distinct from the domain ``role``).
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["display_name"]

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.display_name} <{self.email}>"

    def save(self, *args, **kwargs):
        if not self.username:
            self.username = self._generate_username()
        if not self.avatar_seed:
            self.avatar_seed = self.display_name or self.email
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_username() -> str:
        # Readable, collision-resistant handle. Uniqueness is enforced by the DB;
        # the random suffix makes practical collisions vanishingly unlikely.
        return f"@nava_{secrets.randbelow(9000) + 1000}{secrets.token_hex(2)}"

    @property
    def is_platform_staff(self) -> bool:
        """Support or admin — the dashboard audience (not Django ``is_staff``)."""
        return self.role in {Role.SUPPORT, Role.ADMIN}

    @property
    def is_admin(self) -> bool:
        return self.role == Role.ADMIN

    @property
    def subscription_is_active(self) -> bool:
        """A paid plan is only in force until its renewal date passes.

        Basic is free and never lapses; a paid tier without a renewal date is
        treated as lapsed rather than perpetual, so a missing date can never
        hand out free privileges.
        """
        if self.subscription_tier == SubscriptionTier.BASIC:
            return True
        return (
            self.subscription_renews_at is not None
            and self.subscription_renews_at > timezone.now()
        )

    @property
    def current_tier(self) -> str:
        """The tier actually in force. A lapsed paid plan falls back to basic.

        Every entitlement check reads this rather than ``subscription_tier``,
        so an expired subscription stops granting privileges the moment it
        lapses — without depending on a scheduled job having run.
        """
        return self.subscription_tier if self.subscription_is_active else SubscriptionTier.BASIC


class UserPreferences(models.Model):
    """App settings synced per account across devices (spec §5.3)."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="preferences")
    language = models.CharField(max_length=4, choices=Language.choices, default=Language.FA)
    volume = models.PositiveSmallIntegerField(default=80)
    notifications_enabled = models.BooleanField(default=True)

    def __str__(self):
        return f"prefs<{self.user_id}>"


class Artist(PrefixedIDModel, TimeStampedModel):
    """
    Artist profile — a separate entity from :class:`User` because catalog items
    reference the artist and the verification workflow lives here.
    """

    id_prefix = "ar"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="artist")
    name = models.CharField(max_length=120)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to="artist-avatars/", null=True, blank=True)
    avatar_seed = models.CharField(max_length=120, blank=True)
    genres = models.JSONField(default=list, blank=True)  # list of Genre codes
    verified = models.BooleanField(default=False)
    status = models.CharField(
        max_length=16, choices=ArtistStatus.choices, default=ArtistStatus.PENDING
    )
    rejection_reason = models.TextField(blank=True)
    portfolio = models.TextField(blank=True)

    # Denormalized display metrics. ``follower_count`` is maintained on
    # follow/unfollow; ``monthly_listeners``/``total_streams`` are materialized
    # snapshots (recomputable from StreamEvent by a periodic job).
    follower_count = models.PositiveIntegerField(default=0)
    monthly_listeners = models.PositiveIntegerField(default=0)
    total_streams = models.PositiveBigIntegerField(default=0)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    @property
    def is_approved(self) -> bool:
        return self.status == ArtistStatus.APPROVED


class Follow(models.Model):
    """A listener following an artist (drives follower counts, release fan-out)."""

    follower = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="following_links"
    )
    artist = models.ForeignKey(
        Artist, on_delete=models.CASCADE, related_name="follower_links"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["follower", "artist"], name="unique_follow"
            )
        ]

    def __str__(self):
        return f"{self.follower_id} → {self.artist_id}"
