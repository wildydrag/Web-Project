from rest_framework.routers import DefaultRouter

from .views import AlbumViewSet, ArtistViewSet, SongViewSet

router = DefaultRouter()
router.register("artists", ArtistViewSet, basename="artist")
router.register("songs", SongViewSet, basename="song")
router.register("albums", AlbumViewSet, basename="album")

urlpatterns = router.urls
