"use client";

import Link from "next/link";
import { Play } from "lucide-react";

import { ArtistLinks } from "@/components/artist-links";
import { CoverArt } from "@/components/cover-art";
import { EqualizerBars } from "@/components/equalizer-bars";
import { SongMenu } from "@/components/catalog/song-menu";
import { byId, getArtistsByIds } from "@/lib/data/selectors";
import { formatDuration, toFaDigits } from "@/lib/format";
import { usePlayback } from "@/lib/hooks/use-playback";
import { useDb } from "@/lib/stores/db-store";
import { currentSongId, usePlayer } from "@/lib/stores/player-store";
import type { Song } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

/**
 * A track row for lists (albums, playlists, search results, artist pages).
 * `context` is the list of song ids the row plays within, so "next/previous"
 * follow that list.
 */
export function SongRow({
  song,
  context,
  index,
  showAlbum = true,
}: {
  song: Song;
  context: string[];
  index?: number;
  showAlbum?: boolean;
}) {
  const t = useT();
  const artists = useDb((s) => s.artists);
  const albums = useDb((s) => s.albums);
  const { playSong } = usePlayback();
  const isCurrent = usePlayer(currentSongId) === song.id;
  const isPlaying = usePlayer((s) => s.isPlaying);
  const togglePlay = usePlayer((s) => s.togglePlay);

  const album = song.albumId ? byId(albums, song.albumId) : undefined;
  const songArtists = getArtistsByIds(artists, song.artistIds);

  function play() {
    if (isCurrent) togglePlay();
    else playSong(context, song.id);
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/60",
        isCurrent && "bg-accent/40",
      )}
    >
      <div className="flex w-7 shrink-0 items-center justify-center">
        {isCurrent && isPlaying ? (
          <EqualizerBars />
        ) : (
          <>
            <span className="tabular text-sm text-muted-foreground group-hover:hidden">
              {index != null ? toFaDigits(index + 1) : "♪"}
            </span>
            <button
              onClick={play}
              aria-label={t("پخش")}
              className="hidden text-foreground group-hover:block"
            >
              <Play className="size-4 fill-current" />
            </button>
          </>
        )}
      </div>

      <CoverArt
        seed={song.coverSeed}
        url={song.coverUrl}
        label={song.title}
        className="size-10 shrink-0"
        rounded="rounded-md"
      />

      <div className="min-w-0 flex-1">
        <button
          onClick={play}
          className={cn(
            "block max-w-full truncate text-start text-sm font-medium hover:underline",
            isCurrent && "text-primary",
          )}
        >
          {song.title}
        </button>
        <ArtistLinks artists={songArtists} className="text-xs text-muted-foreground" />
      </div>

      {showAlbum && album ? (
        <Link
          href={`/album/${album.id}`}
          className="hidden w-40 shrink-0 truncate text-sm text-muted-foreground hover:underline lg:block"
        >
          {album.title}
        </Link>
      ) : null}

      <span className="tabular hidden shrink-0 text-xs text-muted-foreground sm:block">
        {formatDuration(song.durationSec)}
      </span>
      <SongMenu songId={song.id} triggerClassName="opacity-0 group-hover:opacity-100" />
    </div>
  );
}
