"use client";

import { Sparkles } from "lucide-react";

import { AlbumCard } from "@/components/catalog/album-card";
import { MediaGrid } from "@/components/catalog/media-grid";
import { RecommendationsSection } from "@/components/catalog/recommendations-section";
import { PlaylistCard } from "@/components/catalog/playlist-card";
import { SongCard } from "@/components/catalog/song-card";
import { SectionHeader } from "@/components/section-header";
import { getUserPlaylists, isVisibleToUser } from "@/lib/data/selectors";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "شب‌ بخیر";
  if (hour < 12) return "صبح بخیر";
  if (hour < 17) return "ظهر بخیر";
  return "عصر بخیر";
}

export default function HomePage() {
  const user = useCurrentUser();
  const albums = useDb((s) => s.albums);
  const songs = useDb((s) => s.songs);
  const playlists = useDb((s) => s.playlists);
  if (!user) return null;

  const myPlaylists = getUserPlaylists(playlists, user.id)
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);

  const recentAlbums = albums
    .filter((a) => isVisibleToUser(a, user))
    .sort((a, b) => +new Date(b.releaseDate) - +new Date(a.releaseDate))
    .slice(0, 5);

  const topSongs = songs
    .filter((s) => isVisibleToUser(s, user))
    .sort((a, b) => b.streamCount - a.streamCount)
    .slice(0, 5);
  const topSongIds = topSongs.map((s) => s.id);

  const isGold = user.subscriptionTier === "gold";
  const earlyAlbums = albums.filter((a) => a.earlyAccess);
  const earlySingles = songs.filter((s) => !s.albumId && s.earlyAccess);

  return (
    <div className="space-y-9">
      <header>
        <p className="text-sm text-muted-foreground">{greeting()}</p>
        <h1 className="font-heading text-2xl font-bold">{user.displayName}</h1>
      </header>

      {/* Gold-only early access */}
      {isGold && (earlyAlbums.length > 0 || earlySingles.length > 0) ? (
        <section className="rounded-2xl border border-gold/25 bg-gold/5 p-4">
          <SectionHeader
            title="دسترسی زودهنگام"
            description="آثار تازه، زودتر از همه برای اعضای طلایی."
          />
          <MediaGrid>
            {earlyAlbums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
            {earlySingles.map((song) => (
              <SongCard key={song.id} song={song} context={earlySingles.map((s) => s.id)} />
            ))}
          </MediaGrid>
        </section>
      ) : null}

      {myPlaylists.length > 0 ? (
        <section>
          <SectionHeader
            title="پلی‌لیست‌های اخیر"
            seeAllHref="/playlists"
          />
          <MediaGrid>
            {myPlaylists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </MediaGrid>
        </section>
      ) : null}

      <section>
        <SectionHeader
          title="تازه‌ترین آلبوم‌ها"
          description="جدیدترین آثار منتشرشده در نوا"
          seeAllHref="/library"
        />
        <MediaGrid>
          {recentAlbums.map((album) => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </MediaGrid>
      </section>

      <RecommendationsSection />

      <section>
        <SectionHeader title="پرشنونده‌ها" description="آهنگ‌هایی که این روزها زیاد شنیده می‌شوند" />
        <MediaGrid>
          {topSongs.map((song) => (
            <SongCard key={song.id} song={song} context={topSongIds} />
          ))}
        </MediaGrid>
      </section>

      {!isGold ? (
        <section className="flex flex-col items-start gap-2 rounded-2xl border border-gold/25 bg-gold/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-gold" />
            <div>
              <p className="font-medium">دسترسی زودهنگام و استریم نامحدود می‌خواهید؟</p>
              <p className="text-sm text-muted-foreground">
                با اشتراک طلایی، آثار جدید را زودتر بشنوید.
              </p>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
