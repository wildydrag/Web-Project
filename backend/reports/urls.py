from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    DashboardApprovalsView,
    DashboardOverviewView,
    DashboardSubscriptionsView,
    HomeView,
    LibraryView,
    PayoutViewSet,
)

router = DefaultRouter()
router.register("dashboard/audits", PayoutViewSet, basename="audit")

urlpatterns = [
    path("home/", HomeView.as_view(), name="home"),
    path("library/", LibraryView.as_view(), name="library"),
    path("dashboard/overview/", DashboardOverviewView.as_view(), name="dashboard-overview"),
    path("dashboard/subscriptions/", DashboardSubscriptionsView.as_view(), name="dashboard-subscriptions"),
    path("dashboard/approvals/", DashboardApprovalsView.as_view(), name="dashboard-approvals"),
    *router.urls,
]
