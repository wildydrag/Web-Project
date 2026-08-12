"""
Downgrade users whose paid subscription has lapsed.

Entitlement checks already read :attr:`User.current_tier`, which treats a lapsed
plan as basic — so privileges stop the moment a subscription expires, with or
without this command. This keeps the stored column consistent with that truth,
which matters for reporting (an expired member should not be counted as paying
revenue) and for the admin site.

Safe to run repeatedly; intended for a daily schedule.

    python manage.py expire_subscriptions [--dry-run]
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from accounts.models import User
from common.constants import SubscriptionTier


class Command(BaseCommand):
    help = "Downgrade users whose paid subscription period has ended."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report what would change without writing.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        lapsed = User.objects.filter(
            subscription_renews_at__lt=timezone.now()
        ).exclude(subscription_tier=SubscriptionTier.BASIC)

        if not lapsed.exists():
            self.stdout.write("No expired subscriptions.")
            return

        for user in lapsed:
            self.stdout.write(
                f"  {user.email}: {user.subscription_tier} -> basic "
                f"(ended {user.subscription_renews_at:%Y-%m-%d})"
            )

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING(
                f"Dry run — {lapsed.count()} subscription(s) would be downgraded."
            ))
            return

        count = lapsed.update(
            subscription_tier=SubscriptionTier.BASIC, subscription_renews_at=None
        )
        self.stdout.write(self.style.SUCCESS(f"Downgraded {count} subscription(s)."))
