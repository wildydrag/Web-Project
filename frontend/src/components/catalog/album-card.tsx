"use client";

import Link from "next/link";

import { ArtistLinks } from "@/components/artist-links";
import { CardPlayButton } from "@/components/catalog/card-play-button";
import { CoverArt } from "@/components/cover-art";
import { getArtistsByIds } from "@/lib/data/selectors";
import { usePlayback } from "@/lib/hooks/use-playback";
import { useDb } from "@/lib/stores/db-store";
import { currentSongId, usePlayer } from "@/lib/stores/player-store";
import type { Album } from "@/lib/types";

/** Grid card for an album. Cover/title link to the album; the button plays it. */
export function AlbumCard({ album }: { album: Album }) {
  const artists = useDb((s) => s.artists);
  const { playList } = usePlayback();
  const isPlaying = usePlayer((s) => s.isPlaying);
  const currentId = usePlayer(currentSongId);

  const albumArtists = getArtistsByIds(artists, album.artistIds);
  const playingThisAlbum = currentId ? album.songIds.includes(currentId) : false;

  function play(event: React.MouseEvent) {
    event.preventDefault();
    playList(album.songIds, 0);
  }

  return (
    <div className="group rounded-xl p-2 transition-colors hover:bg-accent/50">
      <Link href={`/album/${album.id}`} className="relative mb-2 block">
        <CoverArt seed={album.coverSeed} url={album.coverUrl} label={album.title} rounded="rounded-lg" />
        <CardPlayButton onClick={play} playing={playingThisAlbum && isPlaying} />
      </Link>
      <Link
        href={`/album/${album.id}`}
        className="block max-w-full truncate text-sm font-medium hover:underline"
      >
        {album.title}
      </Link>
      <div className="truncate">
        <ArtistLinks artists={albumArtists} className="text-xs text-muted-foreground" />
      </div>
    </div>
  );
}
