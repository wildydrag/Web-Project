"use client";

import Link from "next/link";
import { CreditCard, Ticket, UserCheck, Users, Wallet } from "lucide-react";

import { StatTile } from "@/components/stat-tile";
import { Button } from "@/components/ui/button";
import { formatNumber, formatToman } from "@/lib/format";
import { useApiResource } from "@/lib/api/hooks";
import { useCurrentUser } from "@/lib/stores/session-store";

/** Server-aggregated figures; admin-only fields are omitted for support staff. */
interface DashboardOverview {
  openTickets: number;
  pendingArtists: number;
  totalUsers?: number;
  monthlyRevenue?: number;
}

export default function DashboardOverviewPage() {
  const user = useCurrentUser();
  // All counts and sums are computed by the backend — the frontend only renders.
  const { data } = useApiResource<DashboardOverview>("/dashboard/overview/");
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const openTickets = data?.openTickets ?? 0;
  const pending = data?.pendingArtists ?? 0;
  const totalUsers = data?.totalUsers ?? 0;
  const monthlyRevenue = data?.monthlyRevenue ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">نمای کلی</h1>
        <p className="text-sm text-muted-foreground">
          خوش آمدید، {user.displayName}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="تیکت‌های باز" value={formatNumber(openTickets)} icon={Ticket} />
        <StatTile label="درخواست‌های در انتظار" value={formatNumber(pending)} icon={UserCheck} />
        {isAdmin ? (
          <>
            <StatTile label="کل کاربران" value={formatNumber(totalUsers)} icon={Users} />
            <StatTile
              label="درآمد ماهانه (تخمینی)"
              value={formatToman(monthlyRevenue)}
              icon={Wallet}
            />
          </>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <QuickLink
          href="/dashboard/tickets"
          icon={Ticket}
          title="تیکت‌های پشتیبانی"
          description="پاسخ به سوالات کاربران"
        />
        <QuickLink
          href="/dashboard/approvals"
          icon={UserCheck}
          title="احراز هویت هنرمندان"
          description="بررسی و تایید درخواست‌ها"
        />
        {isAdmin ? (
          <>
            <QuickLink
              href="/dashboard/auditing"
              icon={Wallet}
              title="حسابرسی"
              description="پاداش و تسویه هنرمندان"
            />
            <QuickLink
              href="/dashboard/subscriptions"
              icon={CreditCard}
              title="اشتراک‌ها و قیمت‌ها"
              description="مدیریت قیمت و گزارش درآمد"
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Ticket;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-accent/50"
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Button variant="ghost" size="sm">
        ورود
      </Button>
    </Link>
  );
}
