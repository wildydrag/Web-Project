"use client";

import Link from "next/link";

import { CardPlayButton } from "@/components/catalog/card-play-button";
import { CoverArt } from "@/components/cover-art";
import { toFaDigits } from "@/lib/format";
import { usePlayback } from "@/lib/hooks/use-playback";
import type { Playlist } from "@/lib/types";
import { useT } from "@/lib/i18n";

/** Grid card for a playlist; links to its detail page, button plays it. */
export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const t = useT();
  const { playList } = usePlayback();
  const count = playlist.songIds.length;

  return (
    <div className="group rounded-xl p-2 transition-colors hover:bg-accent/50">
      <Link href={`/playlist/${playlist.id}`} className="relative mb-2 block">
        <CoverArt seed={playlist.coverSeed} label={playlist.name} rounded="rounded-lg" />
        {count > 0 ? (
          <CardPlayButton
            onClick={(event) => {
              event.preventDefault();
              playList(playlist.songIds, 0);
            }}
          />
        ) : null}
      </Link>
      <Link
        href={`/playlist/${playlist.id}`}
        className="block truncate text-sm font-medium hover:underline"
      >
        {playlist.name}
      </Link>
      <p className="text-xs text-muted-foreground">{t("{n} آهنگ", { n: toFaDigits(count) })}</p>
    </div>
  );
}
