"use client";

import { ArtistLinks } from "@/components/artist-links";
import { CardPlayButton } from "@/components/catalog/card-play-button";
import { SongMenu } from "@/components/catalog/song-menu";
import { CoverArt } from "@/components/cover-art";
import { getArtistsByIds } from "@/lib/data/selectors";
import { usePlayback } from "@/lib/hooks/use-playback";
import { useDb } from "@/lib/stores/db-store";
import { currentSongId, usePlayer } from "@/lib/stores/player-store";
import type { Song } from "@/lib/types";
import { useT } from "@/lib/i18n";

/** Grid card for a single/track. Clicking the cover or title plays it. */
export function SongCard({ song, context }: { song: Song; context?: string[] }) {
  const t = useT();
  const artists = useDb((s) => s.artists);
  const { playSong } = usePlayback();
  const isCurrent = usePlayer(currentSongId) === song.id;
  const isPlaying = usePlayer((s) => s.isPlaying);
  const togglePlay = usePlayer((s) => s.togglePlay);

  const songArtists = getArtistsByIds(artists, song.artistIds);
  const ctx = context ?? [song.id];

  function play(event?: React.MouseEvent) {
    event?.preventDefault();
    if (isCurrent) togglePlay();
    else playSong(ctx, song.id);
  }

  return (
    <div className="group rounded-xl p-2 transition-colors hover:bg-accent/50">
      <div className="relative mb-2">
        <button onClick={play} className="block w-full" aria-label={t("پخش {title}", { title: song.title })}>
          <CoverArt seed={song.coverSeed} label={song.title} rounded="rounded-lg" />
        </button>
        <CardPlayButton onClick={play} playing={isCurrent && isPlaying} />
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={play}
          className="min-w-0 flex-1 truncate text-start text-sm font-medium hover:underline"
        >
          {song.title}
        </button>
        <SongMenu songId={song.id} triggerClassName="shrink-0 opacity-0 group-hover:opacity-100" />
      </div>
      <div className="truncate">
        <ArtistLinks artists={songArtists} className="text-xs text-muted-foreground" />
      </div>
    </div>
  );
}
