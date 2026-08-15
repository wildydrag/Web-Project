"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/lib/navigation";
import { toFaDigits } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/** Shared vertical nav list used by both the desktop sidebar and mobile drawer. */
export function NavLinks({
  items,
  counts,
  onNavigate,
}: {
  items: NavItem[];
  /** Optional unread/count badges keyed by href (e.g. notifications). */
  counts?: Record<string, number>;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const count = counts?.[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <item.icon className="size-[18px] shrink-0" />
            <span className="flex-1 truncate">{t(item.label)}</span>
            {count ? (
              <span className="tabular flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                {toFaDigits(count)}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
