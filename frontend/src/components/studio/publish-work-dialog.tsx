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
import { useT } from "@/lib/i18n";
import { toFaDigits } from "@/lib/format";
import { readAudioDuration } from "@/lib/audio-duration";

type ReleaseKind = "single" | "album";
interface TrackDraft {
  title: string;
  durationSec: number;
  /** Without this the track publishes fine but plays nothing. */
  audio?: File;
  /** Optional; a track with no artwork of its own shows the album's. */
  cover?: File;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/** What the brief asks for: MP3, WAV, FLAC. */
const AUDIO_ACCEPT = "audio/*,.mp3,.wav,.flac";

/**
 * Publish a new single or album.
 *
 * Every track — the single, or each track of an album — can carry its own audio
 * file and artwork, and both are uploaded for real. Choosing a file fills in the
 * duration from the file itself, so the artist does not have to count seconds.
 */
export function PublishWorkDialog({ artistId }: { artistId: string }) {
  const t = useT();
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

  /** Update one field of one track, leaving the rest of the list alone. */
  function patchTrack(index: number, patch: Partial<TrackDraft>) {
    setTracks((prev) => prev.map((t, j) => (j === index ? { ...t, ...patch } : t)));
  }

  function toggleCollaborator(id: string) {
    setCollaborators((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      toast.error(t("عنوان اثر را وارد کنید"));
      return;
    }

    setBusy(true);
    try {
      let created: unknown;
      if (kind === "single") {
        created = await publishSingle(artistId, {
          title: title.trim(),
          genre,
          durationSec,
          releaseDate: releaseDate,
          lyrics: lyrics.trim() || undefined,
          collaboratorIds: collaborators,
          audio: audioFile ?? undefined,
          cover: coverFile ?? undefined,
        });
      } else {
        const validTracks = tracks.filter((t) => t.title.trim());
        if (validTracks.length === 0) {
          toast.error(t("حداقل یک ترک با عنوان وارد کنید"));
          return;
        }
        created = await publishAlbum(artistId, {
          title: title.trim(),
          genre,
          releaseDate: releaseDate,
          collaboratorIds: collaborators,
          tracks: validTracks.map((t) => ({
            title: t.title.trim(),
            durationSec: t.durationSec,
            audio: t.audio,
            cover: t.cover,
          })),
          cover: coverFile ?? undefined,
        });
      }
      if (!created) return; // the store already surfaced the error
      toast.success(t("اثر منتشر شد"));
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
        {t("انتشار اثر")}
      </Button>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("انتشار اثر جدید")}</DialogTitle>
        </DialogHeader>

        <form id="publish-form" onSubmit={submit} className="space-y-4">
          <Tabs value={kind} onValueChange={(v) => setKind(v as ReleaseKind)}>
            <TabsList className="w-full">
              <TabsTrigger value="single" className="flex-1">
                {t("تک‌آهنگ")}
              </TabsTrigger>
              <TabsTrigger value="album" className="flex-1">
                {t("آلبوم")}
              </TabsTrigger>
            </TabsList>

            <div className="space-y-4 pt-4">
              <div className="space-y-1.5">
                <Label htmlFor="work-title">{t("عنوان")}</Label>
                <Input
                  id="work-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1.5">
                  <Label htmlFor="release-date">{t("تاریخ انتشار")}</Label>
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
                  label={t("فایل صوتی")}
                  accept={AUDIO_ACCEPT}
                  file={audioFile}
                  onPick={async (file) => {
                    setAudioFile(file);
                    if (!file) return;
                    const seconds = await readAudioDuration(file);
                    if (seconds) setDurationSec(seconds);
                  }}
                />
                <FilePicker
                  icon={ImageIcon}
                  label={t("کاور")}
                  accept="image/*"
                  file={coverFile}
                  onPick={setCoverFile}
                />
              </div>

              <TabsContent value="single" className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="duration">{t("مدت (ثانیه)")}</Label>
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
                  <Label htmlFor="lyrics">{t("متن آهنگ (اختیاری)")}</Label>
                  <Textarea
                    id="lyrics"
                    value={lyrics}
                    onChange={(event) => setLyrics(event.target.value)}
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="album" className="space-y-3">
                <Label>{t("ترک‌ها")}</Label>
                {tracks.map((track, i) => (
                  <div key={i} className="space-y-2 rounded-lg border p-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={track.title}
                        onChange={(event) => patchTrack(i, { title: event.target.value })}
                        placeholder={t("عنوان ترک {n}", { n: toFaDigits(i + 1) })}
                        className="h-10 flex-1"
                      />
                      <Input
                        type="number"
                        min={1}
                        dir="ltr"
                        value={track.durationSec}
                        onChange={(event) =>
                          patchTrack(i, { durationSec: Number(event.target.value) || 0 })
                        }
                        className="h-10 w-20"
                        aria-label={t("مدت ترک (ثانیه)")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setTracks((prev) => prev.filter((_, j) => j !== i))}
                        disabled={tracks.length <= 1}
                        aria-label={t("حذف ترک")}
                      >
                        <X />
                      </Button>
                    </div>
                    {/* Each track carries its own file — an album is not one
                        recording, and without this the tracks never play. */}
                    <div className="grid grid-cols-2 gap-2">
                      <FilePicker
                        icon={FileAudio}
                        label={t("فایل صوتی")}
                        accept={AUDIO_ACCEPT}
                        file={track.audio ?? null}
                        onPick={async (file) => {
                          patchTrack(i, { audio: file ?? undefined });
                          if (!file) return;
                          const seconds = await readAudioDuration(file);
                          if (seconds) patchTrack(i, { durationSec: seconds });
                        }}
                      />
                      <FilePicker
                        icon={ImageIcon}
                        label={t("کاور")}
                        accept="image/*"
                        file={track.cover ?? null}
                        onPick={(file) => patchTrack(i, { cover: file ?? undefined })}
                      />
                    </div>
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
                  {t("افزودن ترک")}
                </Button>
              </TabsContent>

              {otherArtists.length > 0 ? (
                <div className="space-y-1.5">
                  <Label>{t("هنرمندان همکار (اختیاری)")}</Label>
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
            {t("انتشار")}
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
