"use client";

import { Volume1, Volume2, VolumeX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayer } from "@/lib/stores/player-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/** Mute toggle + volume slider (also bound from Settings → "صدای سامانه"). */
export function VolumeControl({
  className,
  expandOnHover = true,
}: {
  className?: string;
  /** When true, the slider expands on hover (desktop player bar). */
  expandOnHover?: boolean;
}) {
  const t = useT();
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);

  const effective = muted ? 0 : volume;
  const Icon = effective === 0 ? VolumeX : effective < 50 ? Volume1 : Volume2;

  return (
    <div dir="ltr" className={cn("group/volume flex items-center", className)}>
      <Button variant="ghost" size="icon-sm" onClick={toggleMute} aria-label={t("بی‌صدا")}>
        <Icon />
      </Button>
      <div
        className={cn(
          "overflow-hidden transition-[width,opacity,margin] duration-200 ease-out",
          expandOnHover
            ? "ms-2 w-24 opacity-100 [@media(hover:hover)]:ms-0 [@media(hover:hover)]:w-0 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/volume:ms-2 [@media(hover:hover)]:group-hover/volume:w-24 [@media(hover:hover)]:group-hover/volume:opacity-100"
            : "ms-2 w-24 opacity-100",
        )}
      >
        <Slider
          value={[effective]}
          min={0}
          max={100}
          step={1}
          onValueChange={(v) => setVolume(Array.isArray(v) ? v[0] : v)}
          className="w-24 shrink-0"
          aria-label={t("میزان صدا")}
        />
      </div>
    </div>
  );
}
