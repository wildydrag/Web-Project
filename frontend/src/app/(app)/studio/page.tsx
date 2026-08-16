"use client";

import { Clock, Mic2, XCircle } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PublishWorkDialog } from "@/components/studio/publish-work-dialog";
import { WorkItem } from "@/components/studio/work-item";
import { byId, getArtistAlbums, getArtistSingles } from "@/lib/data/selectors";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

export default function StudioPage() {
  const t = useT();
  const user = useCurrentUser();
  const artists = useDb((s) => s.artists);
  const albums = useDb((s) => s.albums);
  const songs = useDb((s) => s.songs);
  if (!user) return null;

  if (user.role !== "artist" || !user.artistId) {
    return (
      <EmptyState
        icon={Mic2}
        title={t("این بخش مخصوص هنرمندان است")}
        description={t("برای انتشار اثر باید حساب هنرمندی داشته باشید.")}
      />
    );
  }

  const artist = byId(artists, user.artistId);
  if (!artist) return null;

  const heading = (
    <div>
      <h1 className="font-heading text-2xl font-bold">{t("مدیریت آثار")}</h1>
      <p className="text-sm text-muted-foreground">{t("آثار خود را منتشر و مدیریت کنید.")}</p>
    </div>
  );

  if (artist.status === "pending") {
    return (
      <div className="space-y-6">
        {heading}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gold/30 bg-gold/5 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-gold/15 text-gold">
            <Clock className="size-6" />
          </div>
          <p className="font-medium">{t("حساب هنرمندی شما در انتظار تایید است")}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("پس از بررسی نمونه‌کارها توسط پشتیبانان، نتیجه به شما اطلاع داده می‌شود و می‌توانید آثار خود را منتشر کنید.")}
          </p>
        </div>
      </div>
    );
  }

  if (artist.status === "rejected") {
    return (
      <div className="space-y-6">
        {heading}
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
            <XCircle className="size-6" />
          </div>
          <p className="font-medium">{t("درخواست هنرمندی شما رد شد")}</p>
          {artist.rejectionReason ? (
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("دلیل: {reason}", { reason: artist.rejectionReason ?? "" })}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const artistAlbums = getArtistAlbums(albums, artist.id);
  const singles = getArtistSingles(songs, artist.id);
  const hasWorks = artistAlbums.length > 0 || singles.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        {heading}
        <PublishWorkDialog artistId={artist.id} />
      </div>

      {!hasWorks ? (
        <EmptyState
          icon={Mic2}
          title={t("هنوز اثری منتشر نکرده‌اید")}
          description={t("اولین تک‌آهنگ یا آلبوم خود را منتشر کنید.")}
        />
      ) : (
        <div className="space-y-2">
          {artistAlbums.map((album) => (
            <WorkItem key={album.id} work={{ kind: "album", album }} />
          ))}
          {singles.map((song) => (
            <WorkItem key={song.id} work={{ kind: "single", song }} />
          ))}
        </div>
      )}
    </div>
  );
}
