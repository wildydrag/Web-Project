"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User as UserIcon } from "lucide-react";

import { TierBadge } from "@/components/tier-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/config";
import { useSession, useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

/** Avatar button that opens the account menu (profile, settings, theme, logout). */
export function UserMenu() {
  const t = useT();
  const user = useCurrentUser();
  const logout = useSession((s) => s.logout);
  const router = useRouter();

  if (!user) return null;

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            className="flex items-center gap-2 rounded-full p-0.5 outline-none transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label={t("حساب کاربری")}
          />
        }
      >
        <UserAvatar name={user.displayName} seed={user.avatarSeed} url={user.avatarUrl} />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-60">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <UserAvatar
            name={user.displayName}
            seed={user.avatarSeed}
            url={user.avatarUrl}
            size="lg"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.username}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-2 pb-1.5">
          <TierBadge tier={user.subscriptionTier} />
          <span className="text-xs text-muted-foreground">{t(ROLE_LABELS[user.role])}</span>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem nativeButton={false} render={<Link href="/profile" />}>
          <UserIcon />
          {t("نمایه من")}
        </DropdownMenuItem>
        <DropdownMenuItem nativeButton={false} render={<Link href="/settings" />}>
          <Settings />
          {t("تنظیمات")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-sm text-muted-foreground">{t("پوسته")}</span>
          <ThemeToggle />
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={handleLogout}>
          <LogOut />
          {t("خروج از حساب")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
