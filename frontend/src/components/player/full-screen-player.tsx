"use client";

import { useState } from "react";
import { ChevronDown, Mic2 } from "lucide-react";

import { ArtistLinks } from "@/components/artist-links";
import { CoverArt } from "@/components/cover-art";
import { PlayerControls } from "@/components/player/player-controls";
import { ProgressBar } from "@/components/player/progress-bar";
import { QueueSheet } from "@/components/player/queue-sheet";
import { VolumeControl } from "@/components/player/volume-control";
import { Button } from "@/components/ui/button";
import { formatCompact } from "@/lib/format";
import { useNowPlaying } from "@/lib/hooks/use-now-playing";
import { usePlayer } from "@/lib/stores/player-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

/**
 * Full-screen player for mobile. Opened by tapping the mini-player; toggles
 * between the cover and the lyrics. Gold members also see per-song stats.
 */
export function FullScreenPlayer() {
  const t = useT();
  const isExpanded = usePlayer((s) => s.isExpanded);
  const setExpanded = usePlayer((s) => s.setExpanded);
  const nowPlaying = useNowPlaying();
  const user = useCurrentUser();
  const [showLyrics, setShowLyrics] = useState(false);

  if (!isExpanded || !nowPlaying) return null;
  const { song, artists } = nowPlaying;
  const isGold = user?.subscriptionTier === "gold";

  return (
    <div className="fixed inset-0 z-50 flex flex-col gap-6 bg-background p-5 duration-200 animate-in fade-in slide-in-from-bottom-4 md:hidden">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setExpanded(false)}
          aria-label={t("بستن پخش‌کننده")}
        >
          <ChevronDown />
        </Button>
        <span className="text-sm font-medium">{t("در حال پخش")}</span>
        <QueueSheet />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        {showLyrics ? (
          <div className="scrollbar-slim w-full flex-1 overflow-y-auto rounded-2xl bg-card p-5 text-center">
            {song.lyrics ? (
              <p className="leading-loose whitespace-pre-line text-muted-foreground">
                {song.lyrics}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("متنی ثبت نشده است.")}</p>
            )}
          </div>
        ) : (
          <CoverArt
            seed={song.coverSeed}
            label={song.title}
            className="w-full max-w-xs"
            rounded="rounded-3xl"
          />
        )}

        <div className="w-full text-center">
          <h2 className="font-heading text-2xl font-bold">{song.title}</h2>
          <div className="mt-1 flex justify-center text-muted-foreground">
            <ArtistLinks artists={artists} />
          </div>
          {isGold ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("{listeners} شنونده · {streams} استریم", {
                listeners: formatCompact(song.listenerCount),
                streams: formatCompact(song.streamCount),
              })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <ProgressBar duration={song.durationSec} />
        <PlayerControls size="lg" />
        <div className="flex items-center justify-between">
          <VolumeControl expandOnHover={false} />
          <Button
            variant={showLyrics ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowLyrics((v) => !v)}
          >
            <Mic2 />
            {t("متن آهنگ")}
          </Button>
        </div>
      </div>
    </div>
  );
}
