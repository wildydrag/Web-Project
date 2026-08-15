"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { AlbumCard } from "@/components/catalog/album-card";
import { MediaGrid } from "@/components/catalog/media-grid";
import { SongCard } from "@/components/catalog/song-card";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { artistNames, getLibraryItems, isVisibleToUser } from "@/lib/data/selectors";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

type SortKey = "streams" | "date";

function LibraryContent() {
  const t = useT();
  const params = useSearchParams();
  const user = useCurrentUser();
  const albums = useDb((s) => s.albums);
  const songs = useDb((s) => s.songs);
  const artists = useDb((s) => s.artists);

  const [query, setQuery] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState<SortKey>("streams");

  // Standalone singles play within the set of all visible singles.
  const singleContext = useMemo(
    () => songs.filter((s) => !s.albumId).map((s) => s.id),
    [songs],
  );

  const items = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return getLibraryItems(albums, songs)
      .filter((item) => {
        const entity = item.kind === "album" ? item.album : item.song;
        if (!isVisibleToUser(entity, user)) return false;
        if (!normalized) return true;
        const haystack = `${item.title} ${artistNames(entity, artists)}`.toLowerCase();
        return haystack.includes(normalized);
      })
      .sort((a, b) =>
        sort === "streams"
          ? b.streams - a.streams
          : +new Date(b.sortDate) - +new Date(a.sortDate),
      );
  }, [albums, songs, artists, user, query, sort]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{t("آلبوم‌ها و تک‌آهنگ‌ها")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("آرشیو نوا را جستجو و کشف کنید.")}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("نام اثر یا هنرمند…")}
            aria-label={t("جستجو در آرشیو")}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="h-10 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="streams">{t("پرشنونده‌ترین")}</SelectItem>
            <SelectItem value="date">{t("تازه‌ترین")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("نتیجه‌ای یافت نشد")}
          description={t("عبارت دیگری را جستجو کنید.")}
        />
      ) : (
        <MediaGrid>
          {items.map((item) =>
            item.kind === "album" ? (
              <AlbumCard key={item.album.id} album={item.album} />
            ) : (
              <SongCard key={item.song.id} song={item.song} context={singleContext} />
            ),
          )}
        </MediaGrid>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryContent />
    </Suspense>
  );
}
