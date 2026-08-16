"use client";

import { Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/** Circular play/pause button that floats over a cover and reveals on hover. */
export function CardPlayButton({
  onClick,
  playing = false,
  className,
}: {
  onClick: (event: React.MouseEvent) => void;
  playing?: boolean;
  className?: string;
}) {
  const t = useT();
  return (
    <button
      onClick={onClick}
      aria-label={playing ? t("توقف") : t("پخش")}
      className={cn(
        "absolute bottom-2 end-2 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all",
        playing
          ? "opacity-100"
          : "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100",
        className,
      )}
    >
      {playing ? (
        <Pause className="size-5 fill-current" />
      ) : (
        <Play className="ms-0.5 size-5 fill-current" />
      )}
    </button>
  );
}
