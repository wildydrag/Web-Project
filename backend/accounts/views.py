"""Auth views: registration (listener/artist), login, and the current user."""

from django.db.models import F
from django.db.models.functions import Greatest
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Artist, Follow
from .serializers import (
    LoginSerializer,
    ProfileUpdateSerializer,
    RegisterArtistSerializer,
    RegisterListenerSerializer,
    UserSerializer,
)


def tokens_for(user) -> dict:
    refresh = RefreshToken.for_user(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


class _RegisterView(APIView):
    """Shared registration flow: validate, create, return tokens + user."""

    permission_classes = [AllowAny]
    serializer_class = None

    def post(self, request):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        payload = tokens_for(user)
        payload["user"] = UserSerializer(user, context={"request": request}).data
        return Response(payload, status=status.HTTP_201_CREATED)


class RegisterListenerView(_RegisterView):
    serializer_class = RegisterListenerSerializer


class RegisterArtistView(_RegisterView):
    serializer_class = RegisterArtistSerializer


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer


class MeView(generics.RetrieveUpdateAPIView):
    """GET the current account; PATCH to edit profile/preferences."""

    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ("PUT", "PATCH"):
            return ProfileUpdateSerializer
        return UserSerializer


class ToggleFollowView(APIView):
    """Follow/unfollow an artist; keeps the denormalized follower_count in sync."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        artist = get_object_or_404(Artist, id=request.data.get("artist_id"))
        follow = Follow.objects.filter(follower=request.user, artist=artist).first()
        if follow is None:
            Follow.objects.create(follower=request.user, artist=artist)
            Artist.objects.filter(pk=artist.pk).update(follower_count=F("follower_count") + 1)
            following = True
        else:
            follow.delete()
            Artist.objects.filter(pk=artist.pk).update(
                follower_count=Greatest(F("follower_count") - 1, 0)
            )
            following = False
        return Response({"following": following})
