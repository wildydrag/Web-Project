"use client";

import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/format";
import { usePlayer } from "@/lib/stores/player-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/**
 * Seekable progress bar. Forced `dir="ltr"` so the timeline reads left→right
 * (elapsed on the left, total on the right) like every media player.
 */
export function ProgressBar({
  duration,
  showTimes = true,
  className,
}: {
  duration: number;
  showTimes?: boolean;
  className?: string;
}) {
  const t = useT();
  const position = usePlayer((s) => s.positionSec);
  const seek = usePlayer((s) => s.seek);
  const value = Math.min(position, duration);

  return (
    <div dir="ltr" className={cn("flex items-center gap-2", className)}>
      {showTimes ? (
        <span className="tabular w-10 text-end text-xs text-muted-foreground">
          {formatDuration(value)}
        </span>
      ) : null}
      <Slider
        value={[value]}
        min={0}
        max={Math.max(duration, 1)}
        step={1}
        onValueChange={(v) => seek(Array.isArray(v) ? v[0] : v)}
        className="flex-1"
        aria-label={t("نوار پیشرفت آهنگ")}
      />
      {showTimes ? (
        <span className="tabular w-10 text-xs text-muted-foreground">
          {formatDuration(duration)}
        </span>
      ) : null}
    </div>
  );
}
