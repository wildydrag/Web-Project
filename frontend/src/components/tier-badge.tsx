"use client";

import { Crown, Sparkles, Music2 } from "lucide-react";

import { TIERS } from "@/lib/config";
import type { SubscriptionTier } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const TIER_STYLES: Record<
  SubscriptionTier,
  { icon: typeof Crown; className: string }
> = {
  gold: {
    icon: Crown,
    className: "bg-gold/15 text-gold ring-1 ring-gold/30",
  },
  silver: {
    icon: Sparkles,
    className: "bg-silver/15 text-silver ring-1 ring-silver/30",
  },
  basic: {
    icon: Music2,
    className: "bg-muted text-muted-foreground ring-1 ring-border",
  },
};

/** Small pill that labels a subscription tier (basic / silver / gold). */
export function TierBadge({
  tier,
  className,
  showLabel = true,
}: {
  tier: SubscriptionTier;
  className?: string;
  showLabel?: boolean;
}) {
  const t = useT();
  const { icon: Icon, className: tierClass } = TIER_STYLES[tier];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        tierClass,
        className,
      )}
    >
      <Icon className="size-3" />
      {showLabel ? <span>{t(TIERS[tier].label)}</span> : null}
    </span>
  );
}
