"use client";

import { useParams } from "next/navigation";
import { Headphones, Play, Radio, Users } from "lucide-react";

import { AlbumCard } from "@/components/catalog/album-card";
import { MediaGrid } from "@/components/catalog/media-grid";
import { SongCard } from "@/components/catalog/song-card";
import { FollowButton } from "@/components/follow-button";
import { NotFoundBlock } from "@/components/not-found-block";
import { SectionHeader } from "@/components/section-header";
import { StatTile } from "@/components/stat-tile";
import { UserAvatar } from "@/components/user-avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { Button } from "@/components/ui/button";
import { byId, getArtistAlbums, getArtistSingles, getArtistSongs } from "@/lib/data/selectors";
import { formatCompact } from "@/lib/format";
import { usePlayback } from "@/lib/hooks/use-playback";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

export default function ArtistPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const artists = useDb((s) => s.artists);
  const albums = useDb((s) => s.albums);
  const songs = useDb((s) => s.songs);
  const user = useCurrentUser();
  const { playList } = usePlayback();

  const artist = byId(artists, id);
  if (!artist) return <NotFoundBlock title={t("هنرمند یافت نشد")} backHref="/library" />;

  const artistAlbums = getArtistAlbums(albums, artist.id);
  const singles = getArtistSingles(songs, artist.id);
  const singleIds = singles.map((s) => s.id);
  const allSongIds = getArtistSongs(songs, artist.id).map((s) => s.id);
  const isGold = user?.subscriptionTier === "gold";

  return (
    <div className="space-y-8">
      <header className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-start">
        <UserAvatar
          name={artist.name}
          seed={artist.avatarSeed}
          url={artist.avatarUrl}
          className="size-32"
        />
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <h1 className="font-heading text-3xl font-bold">{artist.name}</h1>
            {artist.verified ? <VerifiedBadge className="size-5" /> : null}
          </div>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:mx-0">
            {artist.bio || t("بیوگرافی ثبت نشده است.")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Button
              onClick={() => playList(allSongIds, 0)}
              disabled={allSongIds.length === 0}
            >
              <Play className="fill-current" />
              {t("پخش آثار")}
            </Button>
            <FollowButton targetId={artist.id} />
          </div>
        </div>
      </header>

      {/* Gold-only analytics */}
      {isGold ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile
            label={t("شنوندگان ماهانه")}
            value={formatCompact(artist.monthlyListeners)}
            icon={Headphones}
          />
          <StatTile
            label={t("کل استریم‌ها")}
            value={formatCompact(artist.totalStreams)}
            icon={Radio}
          />
          <StatTile
            label={t("دنبال‌کننده")}
            value={formatCompact(artist.followerCount)}
            icon={Users}
          />
        </div>
      ) : null}

      {artistAlbums.length > 0 ? (
        <section>
          <SectionHeader title={t("آلبوم‌ها")} />
          <MediaGrid>
            {artistAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </MediaGrid>
        </section>
      ) : null}

      {singles.length > 0 ? (
        <section>
          <SectionHeader title={t("تک‌آهنگ‌ها")} />
          <MediaGrid>
            {singles.map((song) => (
              <SongCard key={song.id} song={song} context={singleIds} />
            ))}
          </MediaGrid>
        </section>
      ) : null}

      {artistAlbums.length === 0 && singles.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("هنوز اثری منتشر نشده است.")}</p>
      ) : null}
    </div>
  );
}
