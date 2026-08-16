"use client";

import { useState } from "react";

import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/format";
import { usePlayer } from "@/lib/stores/player-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const first = (v: number | readonly number[]) => (Array.isArray(v) ? v[0] : (v as number));

/**
 * Seekable progress bar. Forced `dir="ltr"` so the timeline reads left→right
 * (elapsed on the left, total on the right) like every media player.
 *
 * While the user is scrubbing, `scrub` owns the displayed value and the playing
 * position is ignored. Without that the slider is a controlled input whose value
 * is rewritten several times a second by the audio clock, which overrides the
 * gesture in progress — seeking during playback simply did nothing.
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
  const [scrub, setScrub] = useState<number | null>(null);
  const value = scrub ?? Math.min(position, duration);

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
        // Track the gesture locally, and only tell the player where to jump
        // once the user lets go.
        onValueChange={(v) => setScrub(first(v))}
        onValueCommitted={(v) => {
          seek(first(v));
          setScrub(null);
        }}
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
