"use client";

import { BadgeCheck } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/** The "verified artist" mark shown next to approved artists' names. */
export function VerifiedBadge({ className }: { className?: string }) {
  const t = useT();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className={cn("inline-flex text-primary", className)} aria-label={t("هنرمند تایید شده")} />
        }
      >
        <BadgeCheck className="size-4" />
      </TooltipTrigger>
      <TooltipContent>{t("هنرمند تایید شده")}</TooltipContent>
    </Tooltip>
  );
}
