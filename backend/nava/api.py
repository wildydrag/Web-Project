"""
API URL assembly.

Each domain app contributes its routes here, keeping ``nava/urls.py`` thin.
Routes are added as the corresponding apps are built out.
"""

from django.urls import include, path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    return Response({"status": "ok", "service": "nava"})


urlpatterns = [
    path("health/", health, name="health"),
    path("", include("accounts.urls")),
    path("", include("catalog.urls")),
    path("", include("playlists.urls")),
    path("", include("engagement.urls")),
    path("", include("reports.urls")),
]
