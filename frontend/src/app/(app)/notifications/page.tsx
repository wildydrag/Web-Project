"use client";

import Link from "next/link";
import {
  BadgeCheck,
  Bell,
  Check,
  CheckCheck,
  Clock,
  Disc3,
  MessageSquare,
  Trash2,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { getUserNotifications } from "@/lib/data/selectors";
import { formatRelative } from "@/lib/format";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import type { AppNotification, NotificationKind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const KIND_ICON: Record<NotificationKind, LucideIcon> = {
  subscription_expiring: Clock,
  new_release: Disc3,
  artist_verdict: BadgeCheck,
  artist_payout: Wallet,
  new_ticket: MessageSquare,
  new_artist_request: UserPlus,
};

function NotificationCard({ notification }: { notification: AppNotification }) {
  const t = useT();
  const markRead = useDb((s) => s.markNotificationRead);
  const remove = useDb((s) => s.deleteNotification);
  const Icon = KIND_ICON[notification.kind];

  const Title = notification.href ? (
    <Link
      href={notification.href}
      onClick={() => markRead(notification.id)}
      className="font-medium hover:underline"
    >
      {notification.title}
    </Link>
  ) : (
    <span className="font-medium">{notification.title}</span>
  );

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 transition-colors",
        notification.read ? "bg-card" : "border-primary/20 bg-primary/5",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full",
          notification.read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary",
        )}
      >
        <Icon className="size-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {!notification.read ? (
            <span className="size-2 shrink-0 rounded-full bg-primary" aria-label={t("خوانده‌نشده")} />
          ) : null}
          {Title}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{notification.body}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatRelative(notification.createdAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {!notification.read ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("علامت‌گذاری به‌عنوان خوانده‌شده")}
            onClick={() => markRead(notification.id)}
          >
            <Check />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("حذف اعلان")}
          onClick={() => remove(notification.id)}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const t = useT();
  const user = useCurrentUser();
  const notifications = useDb((s) => s.notifications);
  const markAllRead = useDb((s) => s.markAllNotificationsRead);
  if (!user) return null;

  const mine = getUserNotifications(notifications, user.id);
  const hasUnread = mine.some((n) => !n.read);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-2xl font-bold">{t("اعلانات")}</h1>
        {mine.length > 0 ? (
          <Button
            variant="outline"
            size="sm"
            disabled={!hasUnread}
            onClick={() => markAllRead(user.id)}
          >
            <CheckCheck />
            {t("خواندن همه")}
          </Button>
        ) : null}
      </div>

      {mine.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t("اعلان جدیدی ندارید")}
          description={t("هر زمان اتفاق تازه‌ای بیفتد، اینجا به شما اطلاع می‌دهیم.")}
        />
      ) : (
        <div className="space-y-2">
          {mine.map((notification) => (
            <NotificationCard key={notification.id} notification={notification} />
          ))}
        </div>
      )}
    </div>
  );
}
