"use client";

import { useState } from "react";
import { FileAudio, ImageIcon, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { GENRES } from "@/lib/config";
import { useDb } from "@/lib/stores/db-store";
import { cn } from "@/lib/utils";

type ReleaseKind = "single" | "album";
interface TrackDraft {
  title: string;
  durationSec: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Publish a new single or album. Audio/cover file pickers are shown to match the
 * brief (MP3/WAV/FLAC), but in the Phase 1 mock only the metadata is persisted.
 */
export function PublishWorkDialog({ artistId }: { artistId: string }) {
  const artists = useDb((s) => s.artists);
  const publishSingle = useDb((s) => s.publishSingle);
  const publishAlbum = useDb((s) => s.publishAlbum);

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<ReleaseKind>("single");
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState<string>(GENRES[0]);
  const [releaseDate, setReleaseDate] = useState(todayIso());
  const [lyrics, setLyrics] = useState("");
  const [durationSec, setDurationSec] = useState(200);
  const [tracks, setTracks] = useState<TrackDraft[]>([{ title: "", durationSec: 200 }]);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const otherArtists = artists.filter((a) => a.status === "approved" && a.id !== artistId);

  function reset() {
    setKind("single");
    setTitle("");
    setGenre(GENRES[0]);
    setReleaseDate(todayIso());
    setLyrics("");
    setDurationSec(200);
    setTracks([{ title: "", durationSec: 200 }]);
    setCollaborators([]);
    setAudioFile(null);
    setCoverFile(null);
  }

  function toggleCollaborator(id: string) {
    setCollaborators((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("عنوان اثر را وارد کنید");
      return;
    }
    const isoDate = `${releaseDate}T00:00:00.000Z`;

    setBusy(true);
    try {
      let created: unknown;
      if (kind === "single") {
        created = await publishSingle(artistId, {
          title: title.trim(),
          genre,
          durationSec,
          releaseDate: isoDate,
          lyrics: lyrics.trim() || undefined,
          collaboratorIds: collaborators,
          audio: audioFile ?? undefined,
          cover: coverFile ?? undefined,
        });
      } else {
        const validTracks = tracks.filter((t) => t.title.trim());
        if (validTracks.length === 0) {
          toast.error("حداقل یک ترک با عنوان وارد کنید");
          return;
        }
        created = await publishAlbum(artistId, {
          title: title.trim(),
          genre,
          releaseDate: isoDate,
          collaboratorIds: collaborators,
          tracks: validTracks.map((t) => ({ title: t.title.trim(), durationSec: t.durationSec })),
          cover: coverFile ?? undefined,
        });
      }
      if (!created) return; // the store already surfaced the error
      toast.success("اثر منتشر شد");
      reset();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <Plus />
        انتشار اثر
      </Button>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>انتشار اثر جدید</DialogTitle>
        </DialogHeader>

        <form id="publish-form" onSubmit={submit} className="space-y-4">
          <Tabs value={kind} onValueChange={(v) => setKind(v as ReleaseKind)}>
            <TabsList className="w-full">
              <TabsTrigger value="single" className="flex-1">
                تک‌آهنگ
              </TabsTrigger>
              <TabsTrigger value="album" className="flex-1">
                آلبوم
              </TabsTrigger>
            </TabsList>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="work-title">عنوان</Label>
                <Input
                  id="work-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>ژانر</Label>
                  <Select value={genre} onValueChange={(v) => v && setGenre(v)}>
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENRES.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="release-date">تاریخ انتشار</Label>
                  <Input
                    id="release-date"
                    type="date"
                    dir="ltr"
                    value={releaseDate}
                    onChange={(event) => setReleaseDate(event.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              {/* Real uploads: the chosen files are sent to the API as multipart. */}
              <div className="grid grid-cols-2 gap-3">
                <FilePicker
                  icon={FileAudio}
                  label="فایل صوتی"
                  accept="audio/*,.mp3,.wav,.flac"
                  file={audioFile}
                  onPick={setAudioFile}
                />
                <FilePicker
                  icon={ImageIcon}
                  label="کاور"
                  accept="image/*"
                  file={coverFile}
                  onPick={setCoverFile}
                />
              </div>

              <TabsContent value="single" className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="duration">مدت (ثانیه)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min={1}
                    dir="ltr"
                    value={durationSec}
                    onChange={(event) => setDurationSec(Number(event.target.value) || 0)}
                    className="h-10 w-32"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lyrics">متن آهنگ (اختیاری)</Label>
                  <Textarea
                    id="lyrics"
                    value={lyrics}
                    onChange={(event) => setLyrics(event.target.value)}
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="album" className="space-y-3">
                <Label>ترک‌ها</Label>
                {tracks.map((track, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={track.title}
                      onChange={(event) =>
                        setTracks((prev) =>
                          prev.map((t, j) =>
                            j === i ? { ...t, title: event.target.value } : t,
                          ),
                        )
                      }
                      placeholder={`عنوان ترک ${i + 1}`}
                      className="h-10 flex-1"
                    />
                    <Input
                      type="number"
                      min={1}
                      dir="ltr"
                      value={track.durationSec}
                      onChange={(event) =>
                        setTracks((prev) =>
                          prev.map((t, j) =>
                            j === i
                              ? { ...t, durationSec: Number(event.target.value) || 0 }
                              : t,
                          ),
                        )
                      }
                      className="h-10 w-20"
                      aria-label="مدت ترک (ثانیه)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setTracks((prev) => prev.filter((_, j) => j !== i))}
                      disabled={tracks.length <= 1}
                      aria-label="حذف ترک"
                    >
                      <X />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTracks((prev) => [...prev, { title: "", durationSec: 200 }])
                  }
                >
                  <Plus />
                  افزودن ترک
                </Button>
              </TabsContent>

              {otherArtists.length > 0 ? (
                <div className="space-y-1.5">
                  <Label>هنرمندان همکار (اختیاری)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {otherArtists.map((artist) => {
                      const on = collaborators.includes(artist.id);
                      return (
                        <button
                          key={artist.id}
                          type="button"
                          onClick={() => toggleCollaborator(artist.id)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs transition-colors",
                            on
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {artist.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </Tabs>
        </form>

        <DialogFooter>
          <Button type="submit" form="publish-form">
            انتشار
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FilePicker({
  icon: Icon,
  label,
  accept,
  file,
  onPick,
}: {
  icon: typeof FileAudio;
  label: string;
  accept: string;
  file: File | null;
  onPick: (file: File | null) => void;
}) {
  return (
    <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 text-sm text-muted-foreground hover:border-ring">
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{file?.name || label}</span>
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}
