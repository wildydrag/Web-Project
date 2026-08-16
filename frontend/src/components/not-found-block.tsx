"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

/** Friendly "missing record" block for client detail pages (album, artist…). */
export function NotFoundBlock({
  title = "یافت نشد",
  description = "موردی که دنبالش بودید وجود ندارد یا حذف شده است.",
  backHref = "/home",
}: {
  title?: string;
  description?: string;
  backHref?: string;
}) {
  const t = useT();
  // Callers pass Persian source strings — the dictionary keys — so both the
  // defaults above and any override are translated here.
  return (
    <EmptyState
      icon={SearchX}
      title={t(title)}
      description={t(description)}
      action={
        <Button variant="outline" render={<Link href={backHref} />}>
          {t("بازگشت")}
        </Button>
      }
    />
  );
}
