"""
Rebuild the monthly artist payout table from the stream log.

The auditing dashboard shows, per artist, the unique listeners and total streams
recorded in a period plus the reward owed. All three are derived here from
:class:`~reports.models.StreamEvent` rather than stored as estimates.

Idempotent — re-running refreshes the figures, and rows already settled keep
that status.

    python manage.py recalculate_payouts            # current month
    python manage.py recalculate_payouts 2026-07    # a specific month
"""

from django.core.management.base import BaseCommand
from django.utils import timezone

from reports.services import recalculate_payouts


class Command(BaseCommand):
    help = "Recompute artist payouts for a period from recorded streams."

    def add_arguments(self, parser):
        parser.add_argument(
            "period",
            nargs="?",
            help="Year-month key, e.g. 2026-07. Defaults to the current month.",
        )

    def handle(self, *args, **options):
        period = options["period"] or timezone.localdate().strftime("%Y-%m")
        rows = recalculate_payouts(period)

        if not rows:
            self.stdout.write(self.style.WARNING("No approved artists to pay."))
            return

        for payout in sorted(rows, key=lambda p: -p.reward_toman):
            self.stdout.write(
                f"  {payout.artist.name:15} streams={payout.total_streams:6} "
                f"listeners={payout.unique_listeners:5} "
                f"reward={payout.reward_toman:>9,} Toman  [{payout.status}]"
            )
        total = sum(p.reward_toman for p in rows)
        self.stdout.write(self.style.SUCCESS(
            f"Recalculated {len(rows)} payout(s) for {period}; total {total:,} Toman."
        ))
