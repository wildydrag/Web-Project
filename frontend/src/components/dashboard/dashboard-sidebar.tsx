"use client";

import { useState } from "react";
import { Menu } from "lucide-react";

import { Brand } from "@/components/brand";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { dashboardNavForRole } from "@/lib/dashboard-nav";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useEdges, useT } from "@/lib/i18n";

function DashboardSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const t = useT();
  const user = useCurrentUser();
  if (!user) return null;

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-1">
        <Brand />
        <p className="mt-1 text-xs text-muted-foreground">{t("پنل مدیریت")}</p>
      </div>
      <NavLinks items={dashboardNavForRole(user.role)} onNavigate={onNavigate} />
    </div>
  );
}

/** Fixed dashboard sidebar (desktop). */
export function DashboardSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-e border-sidebar-border bg-sidebar md:block">
      <DashboardSidebarContent />
    </aside>
  );
}

/** Hamburger + drawer for the dashboard on mobile. */
export function DashboardMobileSidebar() {
  const edges = useEdges();
  const t = useT();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
        <Menu />
        <span className="sr-only">{t("باز کردن منو")}</span>
      </SheetTrigger>
      <SheetContent side={edges.start} className="w-72 bg-sidebar p-0">
        <SheetTitle className="sr-only">{t("منوی پنل مدیریت")}</SheetTitle>
        <DashboardSidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
