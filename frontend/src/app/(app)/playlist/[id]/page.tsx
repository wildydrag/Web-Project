"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ListPlus, MoreHorizontal, Pencil, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { SongRow } from "@/components/catalog/song-row";
import { CoverArt } from "@/components/cover-art";
import { EmptyState } from "@/components/empty-state";
import { NotFoundBlock } from "@/components/not-found-block";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { byId, getSongsByIds } from "@/lib/data/selectors";
import { toFaDigits } from "@/lib/format";
import { usePlayback } from "@/lib/hooks/use-playback";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

export default function PlaylistDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const playlists = useDb((s) => s.playlists);
  const songs = useDb((s) => s.songs);
  const renamePlaylist = useDb((s) => s.renamePlaylist);
  const deletePlaylist = useDb((s) => s.deletePlaylist);
  const user = useCurrentUser();
  const { playList } = usePlayback();

  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState("");

  const playlist = byId(playlists, id);
  if (!playlist) return <NotFoundBlock title={t("پلی‌لیست یافت نشد")} backHref="/playlists" />;

  const tracks = getSongsByIds(songs, playlist.songIds);
  const isOwner = user?.id === playlist.ownerId;

  function openRename() {
    setName(playlist!.name);
    setRenameOpen(true);
  }

  function submitRename(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    renamePlaylist(playlist!.id, trimmed);
    setRenameOpen(false);
    toast.success(t("نام پلی‌لیست تغییر کرد"));
  }

  function confirmDelete() {
    deletePlaylist(playlist!.id);
    setDeleteOpen(false);
    toast.success(t("پلی‌لیست حذف شد"));
    router.replace("/playlists");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <CoverArt
          seed={playlist.coverSeed}
          url={playlist.coverUrl}
          label={playlist.name}
          className="w-40 shrink-0 sm:w-52"
          rounded="rounded-2xl"
        />
        <div className="flex-1 space-y-3">
          <span className="text-xs font-medium text-muted-foreground">{t("پلی‌لیست")}</span>
          <h1 className="font-heading text-3xl font-bold">{playlist.name}</h1>
          <p className="text-sm text-muted-foreground">{t("{n} آهنگ", { n: toFaDigits(tracks.length) })}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => playList(playlist.songIds, 0)} disabled={tracks.length === 0}>
              <Play className="fill-current" />
              {t("پخش")}
            </Button>
            <Button variant="outline" render={<Link href="/library" />}>
              <ListPlus />
              {t("افزودن آهنگ")}
            </Button>
            {isOwner ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon" aria-label={t("گزینه‌ها")} />}
                >
                  <MoreHorizontal />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openRename}>
                    <Pencil />
                    {t("تغییر نام")}
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                    <Trash2 />
                    {t("حذف پلی‌لیست")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </div>
      </header>

      {tracks.length === 0 ? (
        <EmptyState
          icon={ListPlus}
          title={t("این پلی‌لیست خالی است")}
          description={t("از آرشیو، آهنگ‌ها را با منوی «…» به این پلی‌لیست اضافه کنید.")}
          action={<Button render={<Link href="/library" />}>{t("رفتن به آرشیو")}</Button>}
        />
      ) : (
        <div className="space-y-0.5">
          {tracks.map((song, index) => (
            <SongRow key={song.id} song={song} context={playlist.songIds} index={index} />
          ))}
        </div>
      )}

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("تغییر نام پلی‌لیست")}</DialogTitle>
          </DialogHeader>
          <form id="rename-playlist-form" onSubmit={submitRename}>
            <div className="space-y-1.5">
              <Label htmlFor="rename">{t("نام جدید")}</Label>
              <Input
                id="rename"
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-10"
              />
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form="rename-playlist-form">
              {t("ذخیره")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("حذف «{name}»؟", { name: playlist.name })}</AlertDialogTitle>
            <AlertDialogDescription>{t("این عمل قابل بازگشت نیست.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("انصراف")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete}>
              {t("حذف")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
