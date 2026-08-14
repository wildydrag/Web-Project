"use client";

import { useState } from "react";
import Link from "next/link";
import { Crown, Menu } from "lucide-react";

import { Brand } from "@/components/brand";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { navItemsForRole } from "@/lib/navigation";
import { unreadNotificationCount } from "@/lib/data/selectors";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useEdges, useT } from "@/lib/i18n";

/**
 * The contents of the sidebar — reused by the fixed desktop rail and the mobile
 * drawer (so navigation stays identical across breakpoints).
 */
export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  const user = useCurrentUser();
  const notifications = useDb((s) => s.notifications);
  if (!user) return null;

  const unread = unreadNotificationCount(notifications, user.id);

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/home" onClick={onNavigate} className="px-1">
        <Brand />
      </Link>

      <NavLinks
        items={navItemsForRole(user.role)}
        counts={{ "/notifications": unread }}
        onNavigate={onNavigate}
      />

      {user.subscriptionTier !== "gold" ? (
        <div className="mt-auto rounded-xl border border-gold/25 bg-gold/10 p-4">
          <div className="mb-1 flex items-center gap-2 text-gold">
            <Crown className="size-4" />
            <span className="text-sm font-medium">{t("ارتقا به طلایی")}</span>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            {t("استریم نامحدود، دانلود و دسترسی زودهنگام به آثار جدید.")}
          </p>
          <Button
            size="sm"
            className="w-full"
            render={<Link href="/settings" onClick={onNavigate} />}
          >
            {t("مشاهده اشتراک‌ها")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Fixed desktop sidebar (right-hand side under RTL). */
export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-e border-sidebar-border bg-sidebar md:block">
      <SidebarContent />
    </aside>
  );
}

/** Hamburger button + slide-over drawer holding the same nav, for mobile. */
export function MobileSidebar() {
  const edges = useEdges();
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
      >
        <Menu />
        <span className="sr-only">{t("باز کردن منو")}</span>
      </SheetTrigger>
      <SheetContent side={edges.start} className="w-72 bg-sidebar p-0">
        <SheetTitle className="sr-only">{t("منوی ناوبری")}</SheetTitle>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
