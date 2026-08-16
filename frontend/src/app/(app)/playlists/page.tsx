"use client";

import { ListMusic, Plus } from "lucide-react";

import { CreatePlaylistDialog } from "@/components/catalog/create-playlist-dialog";
import { MediaGrid } from "@/components/catalog/media-grid";
import { PlaylistCard } from "@/components/catalog/playlist-card";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { TIERS, UNLIMITED } from "@/lib/config";
import { getUserPlaylists } from "@/lib/data/selectors";
import { toFaDigits } from "@/lib/format";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

export default function PlaylistsPage() {
  const t = useT();
  const user = useCurrentUser();
  const playlists = useDb((s) => s.playlists);
  if (!user) return null;

  const myPlaylists = getUserPlaylists(playlists, user.id);
  const limit = TIERS[user.subscriptionTier].playlistLimit;
  const limitLabel = limit === UNLIMITED ? t("نامحدود") : toFaDigits(limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">{t("پلی‌لیست‌ها")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("{n} از {limit} پلی‌لیست", { n: toFaDigits(myPlaylists.length), limit: limitLabel })}
          </p>
        </div>
        <CreatePlaylistDialog
          trigger={
            <Button>
              <Plus />
              {t("پلی‌لیست جدید")}
            </Button>
          }
        />
      </div>

      {myPlaylists.length === 0 ? (
        <EmptyState
          icon={ListMusic}
          title={t("هنوز پلی‌لیستی نساخته‌اید")}
          description={t("اولین پلی‌لیست خود را بسازید و آهنگ‌های محبوبتان را کنار هم جمع کنید.")}
          action={
            <CreatePlaylistDialog
              trigger={
                <Button>
                  <Plus />
                  {t("ساخت اولین پلی‌لیست")}
                </Button>
              }
            />
          }
        />
      ) : (
        <MediaGrid>
          {myPlaylists.map((playlist) => (
            <PlaylistCard key={playlist.id} playlist={playlist} />
          ))}
        </MediaGrid>
      )}
    </div>
  );
}
