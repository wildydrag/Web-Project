"use client";

import { ListEnd, ListPlus, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserPlaylists } from "@/lib/data/selectors";
import { useDb } from "@/lib/stores/db-store";
import { usePlayer } from "@/lib/stores/player-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

/**
 * The "…" menu shown on song cards/rows: queue actions and add/remove from any
 * of the user's playlists (checkbox per playlist).
 */
export function SongMenu({
  songId,
  triggerClassName,
}: {
  songId: string;
  triggerClassName?: string;
}) {
  const t = useT();
  const user = useCurrentUser();
  const playlists = useDb((s) => s.playlists);
  const toggleSongInPlaylist = useDb((s) => s.toggleSongInPlaylist);
  const addToQueue = usePlayer((s) => s.addToQueue);
  const playNext = usePlayer((s) => s.playNext);

  if (!user) return null;
  const myPlaylists = getUserPlaylists(playlists, user.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className={triggerClassName}
            aria-label={t("گزینه‌های بیشتر")}
          />
        }
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          onClick={() => {
            playNext(songId);
            toast.success(t("به‌عنوان آهنگ بعدی اضافه شد"));
          }}
        >
          <ListEnd />
          {t("پخش به‌عنوان بعدی")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            addToQueue(songId);
            toast.success(t("به صف پخش اضافه شد"));
          }}
        >
          <ListPlus />
          {t("افزودن به صف")}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Plus />
            {t("افزودن به پلی‌لیست")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
            {myPlaylists.length === 0 ? (
              <DropdownMenuItem disabled>{t("هنوز پلی‌لیستی نساخته‌اید")}</DropdownMenuItem>
            ) : (
              myPlaylists.map((playlist) => (
                <DropdownMenuCheckboxItem
                  key={playlist.id}
                  checked={playlist.songIds.includes(songId)}
                  onCheckedChange={() => toggleSongInPlaylist(playlist.id, songId)}
                >
                  {playlist.name}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
