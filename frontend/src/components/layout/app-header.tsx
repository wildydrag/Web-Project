"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search } from "lucide-react";

import { MobileSidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { Button } from "@/components/ui/button";
import { unreadNotificationCount } from "@/lib/data/selectors";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

/** Global search box that routes to the library with the query applied. */
function SearchBox() {
  const t = useT();
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        router.push(`/library?q=${encodeURIComponent(query.trim())}`);
      }}
      className="flex h-9 w-full max-w-md items-center gap-2 rounded-full border border-input bg-background px-3 text-sm focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40"
    >
      <Search className="size-4 shrink-0 text-muted-foreground" />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("جستجوی آهنگ، آلبوم یا هنرمند…")}
        aria-label={t("جستجو")}
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
      />
    </form>
  );
}

/** Bell linking to notifications, with an unread indicator. */
function NotificationsBell() {
  const t = useT();
  const user = useCurrentUser();
  const notifications = useDb((s) => s.notifications);
  const unread = user ? unreadNotificationCount(notifications, user.id) : 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      render={<Link href="/notifications" />}
    >
      <Bell />
      {unread > 0 ? (
        <span className="absolute top-1.5 end-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />
      ) : null}
      <span className="sr-only">{t("اعلانات")}</span>
    </Button>
  );
}

/** Sticky top bar: mobile menu, search, notifications and account menu. */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
      <MobileSidebar />
      <SearchBox />
      <div className="ms-auto flex items-center gap-1">
        <NotificationsBell />
        <UserMenu />
      </div>
    </header>
  );
}
