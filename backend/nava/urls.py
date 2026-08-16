"""Root URL configuration for the Nava backend.

The public API is mounted under ``/api/`` (assembled in ``nava.api``). In DEBUG,
uploaded media is served by Django for convenience; in production a real web
server / object store handles ``MEDIA_URL``.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("nava.api")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
