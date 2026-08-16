"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMounted } from "@/lib/hooks/use-mounted";
import { useT } from "@/lib/i18n";

/** Light/dark toggle. Renders a stable placeholder until mounted. */
export function ThemeToggle() {
  const t = useT();
  const mounted = useMounted();
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t("تغییر پوسته روشن/تیره")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {mounted && !isDark ? <Moon /> : <Sun />}
    </Button>
  );
}
