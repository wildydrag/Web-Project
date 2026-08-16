"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { DashboardMobileSidebar } from "@/components/dashboard/dashboard-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/config";
import { useCurrentUser, useSession } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

export function DashboardHeader() {
  const t = useT();
  const user = useCurrentUser();
  const logout = useSession((s) => s.logout);
  const router = useRouter();
  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md">
      <DashboardMobileSidebar />
      <div className="ms-auto flex items-center gap-2">
        <ThemeToggle />
        <div className="flex items-center gap-2">
          <UserAvatar name={user.displayName} seed={user.avatarSeed} size="sm" />
          <div className="hidden text-end sm:block">
            <p className="text-sm leading-tight font-medium">{user.displayName}</p>
            <p className="text-xs leading-tight text-muted-foreground">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("خروج")}
          onClick={() => {
            logout();
            router.replace("/login");
          }}
        >
          <LogOut />
        </Button>
      </div>
    </header>
  );
}
