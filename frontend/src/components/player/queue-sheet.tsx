"use client";

import { ListMusic, X } from "lucide-react";

import { CoverArt } from "@/components/cover-art";
import { EqualizerBars } from "@/components/equalizer-bars";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { artistNames, byId } from "@/lib/data/selectors";
import { formatDuration } from "@/lib/format";
import { useDb } from "@/lib/stores/db-store";
import { usePlayer } from "@/lib/stores/player-store";
import { cn } from "@/lib/utils";
import { useEdges, useT } from "@/lib/i18n";

/** "Up next" panel — the playback queue, with jump-to and remove. */
export function QueueSheet() {
  const t = useT();
  const edges = useEdges();
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const jumpTo = usePlayer((s) => s.jumpTo);
  const removeFromQueue = usePlayer((s) => s.removeFromQueue);
  const songs = useDb((s) => s.songs);
  const artists = useDb((s) => s.artists);

  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" aria-label={t("صف پخش")} />}
      >
        <ListMusic />
      </SheetTrigger>
      <SheetContent side={edges.end} className="flex w-full flex-col p-0 sm:max-w-sm">
        <SheetHeader className="border-b">
          <SheetTitle>{t("صف پخش")}</SheetTitle>
        </SheetHeader>

        <div className="scrollbar-slim flex-1 overflow-y-auto p-2">
          {queue.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {t("صف پخش خالی است.")}
            </p>
          ) : (
            <ul className="space-y-1">
              {queue.map((id, i) => {
                const song = byId(songs, id);
                if (!song) return null;
                const current = i === index;
                return (
                  <li
                    key={`${id}-${i}`}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg p-2",
                      current ? "bg-accent" : "hover:bg-accent/60",
                    )}
                  >
                    <button
                      onClick={() => jumpTo(i)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-start"
                    >
                      <CoverArt
                        seed={song.coverSeed}
                        label={song.title}
                        className="size-10"
                        rounded="rounded-md"
                      />
                      <span className="min-w-0">
                        <span
                          className={cn(
                            "block truncate text-sm",
                            current && "font-medium text-primary",
                          )}
                        >
                          {song.title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {artistNames(song, artists)}
                        </span>
                      </span>
                    </button>

                    {current ? (
                      <EqualizerBars playing={isPlaying} className="me-1" />
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="tabular text-xs text-muted-foreground">
                          {formatDuration(song.durationSec)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => removeFromQueue(i)}
                          aria-label={t("حذف از صف")}
                        >
                          <X />
                        </Button>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
