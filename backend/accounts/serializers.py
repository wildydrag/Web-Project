"""Account serializers: the user contract, registration, login, profile edit."""

from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from common.constants import ArtistStatus, Gender, Role
from common.constants import TIERS
from engagement.services import notify_staff_new_artist

from .models import Artist, User, UserPreferences


class PreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPreferences
        fields = ["language", "volume", "notifications_enabled"]


class UserSerializer(serializers.ModelSerializer):
    """Full account representation, matching the Phase 1 ``User`` contract."""

    preferences = PreferencesSerializer(read_only=True)
    following_ids = serializers.SerializerMethodField()
    follower_count = serializers.SerializerMethodField()
    daily_streams = serializers.SerializerMethodField()
    artist_id = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    # The tier actually in force: a lapsed plan reports as basic, so the client
    # never shows privileges the server would refuse.
    subscription_tier = serializers.CharField(source="current_tier", read_only=True)
    subscription_is_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "role", "display_name", "username", "avatar_url",
            "avatar_seed", "gender", "birth_date", "created_at", "subscription_tier",
            "subscription_renews_at", "subscription_is_active", "following_ids",
            "follower_count", "daily_streams", "preferences", "artist_id",
        ]

    def get_following_ids(self, obj) -> list[str]:
        return list(obj.following_links.values_list("artist_id", flat=True))

    def get_follower_count(self, obj) -> int:
        artist = getattr(obj, "artist", None)
        return artist.follower_count if artist else 0

    def get_daily_streams(self, obj) -> int:
        return obj.stream_events.filter(created_at__date=timezone.localdate()).count()

    def get_artist_id(self, obj):
        artist = getattr(obj, "artist", None)
        return artist.id if artist else None

    def get_avatar_url(self, obj):
        if not obj.avatar:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.avatar.url) if request else obj.avatar.url


class RegisterListenerSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    display_name = serializers.CharField(max_length=120)
    gender = serializers.ChoiceField(
        choices=Gender.choices, required=False, default=Gender.UNSPECIFIED
    )
    birth_date = serializers.DateField(required=False, allow_null=True)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("این ایمیل قبلاً ثبت شده است.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(role=Role.LISTENER, **validated_data)
        UserPreferences.objects.create(user=user)
        return user


class RegisterArtistSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=120)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    portfolio = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("این ایمیل قبلاً ثبت شده است.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            role=Role.ARTIST,
            display_name=validated_data["name"],
        )
        UserPreferences.objects.create(user=user)
        artist = Artist.objects.create(
            user=user,
            name=validated_data["name"],
            portfolio=validated_data.get("portfolio", ""),
            status=ArtistStatus.PENDING,
        )
        notify_staff_new_artist(artist)
        return user


class LoginSerializer(TokenObtainPairSerializer):
    """Email+password login that also returns the serialized user."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user, context=self.context).data
        return data


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Self-service profile edit; avatar upload is tier-gated."""

    preferences = PreferencesSerializer(required=False)

    class Meta:
        model = User
        fields = ["display_name", "gender", "birth_date", "avatar", "preferences"]

    def validate_avatar(self, value):
        if value and not TIERS[self.instance.current_tier].can_upload_avatar:
            raise serializers.ValidationError(
                "برای آپلود عکس نمایه باید اشتراک خود را ارتقا دهید."
            )
        return value

    def update(self, instance, validated_data):
        prefs = validated_data.pop("preferences", None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.save()
        if prefs:
            preferences = instance.preferences
            for field, value in prefs.items():
                setattr(preferences, field, value)
            preferences.save()
        return instance

    def to_representation(self, instance):
        return UserSerializer(instance, context=self.context).data
