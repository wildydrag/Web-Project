"use client";

import { useState } from "react";
import { Headphones, MoreHorizontal, Pencil, Radio, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { CoverArt } from "@/components/cover-art";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENRES } from "@/lib/config";
import { formatCompact, formatToman } from "@/lib/format";
import { useDb } from "@/lib/stores/db-store";
import type { Album, Song } from "@/lib/types";
import { useT } from "@/lib/i18n";

// Earnings are calculated by the backend with the same rates that drive the
// admin payout table, so the studio only displays the figure it is given.

type Work =
  | { kind: "album"; album: Album }
  | { kind: "single"; song: Song };

/** A published work row in the artist studio: cover, stats, edit & delete. */
export function WorkItem({ work }: { work: Work }) {
  const t = useT();
  const updateAlbum = useDb((s) => s.updateAlbum);
  const updateSong = useDb((s) => s.updateSong);
  const deleteAlbum = useDb((s) => s.deleteAlbum);
  const deleteSong = useDb((s) => s.deleteSong);

  const data =
    work.kind === "album"
      ? {
          id: work.album.id,
          title: work.album.title,
          coverSeed: work.album.coverSeed,
          coverUrl: work.album.coverUrl,
          genre: work.album.genre,
          listeners: work.album.listenerCount,
          streams: work.album.streamCount,
          revenue: work.album.revenueToman ?? 0,
          typeLabel: t("آلبوم"),
        }
      : {
          id: work.song.id,
          title: work.song.title,
          coverSeed: work.song.coverSeed,
          coverUrl: work.song.coverUrl,
          genre: work.song.genre,
          listeners: work.song.listenerCount,
          streams: work.song.streamCount,
          revenue: work.song.revenueToman ?? 0,
          typeLabel: t("تک‌آهنگ"),
        };

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState(data.title);
  const [genre, setGenre] = useState(data.genre);

  function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    const patch = { title: title.trim() || data.title, genre };
    if (work.kind === "album") updateAlbum(work.album.id, patch);
    else updateSong(work.song.id, patch);
    setEditOpen(false);
    toast.success(t("اثر به‌روزرسانی شد"));
  }

  function confirmDelete() {
    if (work.kind === "album") deleteAlbum(work.album.id);
    else deleteSong(work.song.id);
    setDeleteOpen(false);
    toast.success(t("اثر حذف شد"));
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <CoverArt
        seed={data.coverSeed}
        url={data.coverUrl}
        label={data.title}
        className="size-14 shrink-0"
        rounded="rounded-lg"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{data.title}</p>
        <p className="text-xs text-muted-foreground">
          {data.typeLabel} · {t(data.genre)}
        </p>
      </div>

      <div className="hidden items-center gap-5 text-sm text-muted-foreground sm:flex">
        <span className="flex items-center gap-1" title={t("شنوندگان")}>
          <Headphones className="size-4" />
          {formatCompact(data.listeners)}
        </span>
        <span className="flex items-center gap-1" title={t("استریم‌ها")}>
          <Radio className="size-4" />
          {formatCompact(data.streams)}
        </span>
        <span className="flex items-center gap-1" title={t("درآمد تخمینی")}>
          <Wallet className="size-4" />
          {formatToman(data.revenue)}
        </span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t("گزینه‌ها")} />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil />
            {t("ویرایش")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 />
            {t("حذف")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("ویرایش اثر")}</DialogTitle>
          </DialogHeader>
          <form id={`edit-${data.id}`} onSubmit={saveEdit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`title-${data.id}`}>{t("عنوان")}</Label>
              <Input
                id={`title-${data.id}`}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("ژانر")}</Label>
              <Select value={genre} onValueChange={(v) => v && setGenre(v)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {t(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
          <DialogFooter>
            <Button type="submit" form={`edit-${data.id}`}>
              {t("ذخیره")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("حذف «{name}»؟", { name: data.title })}</AlertDialogTitle>
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
