"use client";

import Link from "next/link";
import { Headphones, Pause, Play, Radio, SkipForward } from "lucide-react";

import { ArtistLinks } from "@/components/artist-links";
import { CoverArt } from "@/components/cover-art";
import { FullScreenPlayer } from "@/components/player/full-screen-player";
import { LyricsSheet } from "@/components/player/lyrics-sheet";
import { PlayerControls } from "@/components/player/player-controls";
import { ProgressBar } from "@/components/player/progress-bar";
import { QueueSheet } from "@/components/player/queue-sheet";
import { VolumeControl } from "@/components/player/volume-control";
import { Button } from "@/components/ui/button";
import { formatCompact, listSeparator } from "@/lib/format";
import { useNowPlaying } from "@/lib/hooks/use-now-playing";
import { usePlayer } from "@/lib/stores/player-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

/** Per-song listener/stream counts, shown only to gold members (per the brief). */
function GoldStats({ listeners, streams }: { listeners: number; streams: number }) {
  return (
    <div className="hidden items-center gap-3 text-xs text-muted-foreground xl:flex">
      <span className="flex items-center gap-1">
        <Headphones className="size-3.5" />
        {formatCompact(listeners)}
      </span>
      <span className="flex items-center gap-1">
        <Radio className="size-3.5" />
        {formatCompact(streams)}
      </span>
    </div>
  );
}

/**
 * The global player. Hidden entirely when nothing is queued; otherwise a full
 * control bar on desktop and a compact mini-player on mobile that expands to a
 * full-screen view. Lives in the layout's flex column so it never overlaps
 * content (no fixed positioning needed).
 */
export function PlayerBar() {
  const t = useT();
  const nowPlaying = useNowPlaying();
  const user = useCurrentUser();
  const isPlaying = usePlayer((s) => s.isPlaying);
  const position = usePlayer((s) => s.positionSec);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const next = usePlayer((s) => s.next);
  const setExpanded = usePlayer((s) => s.setExpanded);

  if (!nowPlaying) return null;
  const { song, artists, album } = nowPlaying;
  const isGold = user?.subscriptionTier === "gold";
  const progress = Math.min(100, (position / Math.max(song.durationSec, 1)) * 100);

  return (
    <>
      {/* ── Desktop bar ─────────────────────────────────────────────────── */}
      <div className="hidden h-20 shrink-0 grid-cols-3 items-center gap-4 border-t bg-card px-4 md:grid">
        {/* Now playing */}
        <div className="flex min-w-0 items-center gap-3">
          <CoverArt
            seed={song.coverSeed}
            url={song.coverUrl}
            label={song.title}
            className="size-14"
            rounded="rounded-lg"
          />
          <div className="min-w-0">
            {album ? (
              <Link
                href={`/album/${album.id}`}
                className="block truncate font-medium hover:underline"
              >
                {song.title}
              </Link>
            ) : (
              <span className="block truncate font-medium">{song.title}</span>
            )}
            <ArtistLinks artists={artists} className="text-xs text-muted-foreground" />
          </div>
        </div>

        {/* Controls + progress */}
        <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-1">
          <div className="flex items-center gap-3">
            <PlayerControls />
            <VolumeControl />
          </div>
          <ProgressBar duration={song.durationSec} className="w-full" />
        </div>

        {/* Output / extras */}
        <div className="flex items-center justify-end gap-1">
          {isGold ? (
            <GoldStats listeners={song.listenerCount} streams={song.streamCount} />
          ) : null}
          <LyricsSheet title={song.title} lyrics={song.lyrics} />
          <QueueSheet />
        </div>
      </div>

      {/* ── Mobile mini-player ──────────────────────────────────────────── */}
      <div className="relative flex h-16 shrink-0 items-center gap-3 border-t bg-card px-3 md:hidden">
        {/* Thin progress line along the top edge. */}
        <span
          className="absolute inset-x-0 top-0 h-0.5 bg-primary transition-[width]"
          style={{ width: `${progress}%` }}
        />
        <button
          onClick={() => setExpanded(true)}
          className="flex min-w-0 flex-1 items-center gap-3 text-start"
          aria-label={t("باز کردن پخش‌کننده تمام‌صفحه")}
        >
          <CoverArt
            seed={song.coverSeed}
            url={song.coverUrl}
            label={song.title}
            className="size-11"
            rounded="rounded-md"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{song.title}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {artists.map((a) => a.name).join(listSeparator())}
            </span>
          </span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={togglePlay}
          aria-label={isPlaying ? t("توقف") : t("پخش")}
        >
          {isPlaying ? <Pause className="fill-current" /> : <Play className="fill-current" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={next} aria-label={t("آهنگ بعدی")}>
          <SkipForward className="fill-current" />
        </Button>
      </div>

      <FullScreenPlayer />
    </>
  );
}
