from rest_framework.routers import DefaultRouter

from .views import NotificationViewSet, TicketViewSet

router = DefaultRouter()
router.register("notifications", NotificationViewSet, basename="notification")
router.register("tickets", TicketViewSet, basename="ticket")

urlpatterns = router.urls
