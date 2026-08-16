"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TIERS } from "@/lib/config";
import { getUserPlaylists } from "@/lib/data/selectors";
import { toFaDigits } from "@/lib/format";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

/**
 * Create-playlist dialog. Enforces the per-tier playlist limit and surfaces a
 * clear message when the user has hit it (basic = 6, silver = 100, gold = ∞).
 */
export function CreatePlaylistDialog({ trigger }: { trigger: React.ReactElement }) {
  const t = useT();
  const user = useCurrentUser();
  const playlists = useDb((s) => s.playlists);
  const createPlaylist = useDb((s) => s.createPlaylist);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!user) return null;
  const limit = TIERS[user.subscriptionTier].playlistLimit;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const created = createPlaylist(user!.id, trimmed);
    if (!created) {
      toast.error(t("به سقف تعداد پلی‌لیست رسیدید"), {
        description: t("اشتراک {tier} حداکثر {n} پلی‌لیست دارد.", {
          tier: t(TIERS[user!.subscriptionTier].label),
          n: toFaDigits(limit),
        }),
      });
      return;
    }
    toast.success(t("پلی‌لیست ساخته شد"));
    setName("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("پلی‌لیست جدید")}</DialogTitle>
        </DialogHeader>
        <form id="create-playlist-form" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="playlist-name">{t("نام پلی‌لیست")}</Label>
            <Input
              id="playlist-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10"
              placeholder={t("مثلاً: آهنگ‌های مورد علاقه")}
            />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="create-playlist-form">
            {t("ساخت")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
