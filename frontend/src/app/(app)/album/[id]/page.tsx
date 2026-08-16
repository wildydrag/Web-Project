"use client";

import { useParams } from "next/navigation";
import { Clock, Play } from "lucide-react";

import { ArtistLinks } from "@/components/artist-links";
import { SongRow } from "@/components/catalog/song-row";
import { CoverArt } from "@/components/cover-art";
import { NotFoundBlock } from "@/components/not-found-block";
import { Button } from "@/components/ui/button";
import { byId, getAlbumSongs, getArtistsByIds } from "@/lib/data/selectors";
import { formatDuration, formatYear, toFaDigits } from "@/lib/format";
import { usePlayback } from "@/lib/hooks/use-playback";
import { useDb } from "@/lib/stores/db-store";
import { useT } from "@/lib/i18n";

export default function AlbumPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const albums = useDb((s) => s.albums);
  const songs = useDb((s) => s.songs);
  const artists = useDb((s) => s.artists);
  const { playList } = usePlayback();

  const album = byId(albums, id);
  if (!album) return <NotFoundBlock title={t("آلبوم یافت نشد")} backHref="/library" />;

  const tracks = getAlbumSongs(album, songs);
  const albumArtists = getArtistsByIds(artists, album.artistIds);
  const totalDuration = tracks.reduce((sum, t) => sum + t.durationSec, 0);
  const totalMinutes = Math.round(totalDuration / 60);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <CoverArt
          seed={album.coverSeed}
          url={album.coverUrl}
          label={album.title}
          className="w-40 shrink-0 sm:w-52"
          rounded="rounded-2xl"
        />
        <div className="space-y-3">
          <span className="text-xs font-medium text-muted-foreground">
            {album.type === "album" ? t("آلبوم") : t("تک‌آهنگ")}
          </span>
          <h1 className="font-heading text-3xl font-bold">{album.title}</h1>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <ArtistLinks artists={albumArtists} className="text-foreground" />
            <span aria-hidden>·</span>
            <span>{formatYear(album.releaseDate)}</span>
            <span aria-hidden>·</span>
            <span>{t("{n} آهنگ", { n: toFaDigits(tracks.length) })}</span>
            <span aria-hidden>·</span>
            <span>{t(album.genre)}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {t("{n} دقیقه", { n: toFaDigits(totalMinutes) })}
            </span>
          </div>
          <Button size="lg" onClick={() => playList(album.songIds, 0)} disabled={tracks.length === 0}>
            <Play className="fill-current" />
            {t("پخش")}
          </Button>
        </div>
      </header>

      <div className="space-y-0.5">
        {tracks.map((song, index) => (
          <SongRow
            key={song.id}
            song={song}
            context={album.songIds}
            index={index}
            showAlbum={false}
          />
        ))}
      </div>
    </div>
  );
}
