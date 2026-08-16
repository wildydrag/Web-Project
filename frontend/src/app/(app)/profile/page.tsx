"use client";

import { useRef, useState } from "react";
import { ImagePlus, Pencil, Radio, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { TierBadge } from "@/components/tier-badge";
import { StatTile } from "@/components/stat-tile";
import { UserAvatar } from "@/components/user-avatar";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ROLE_LABELS, TIERS, UNLIMITED } from "@/lib/config";
import { formatNumber, toFaDigits } from "@/lib/format";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import type { Gender, User } from "@/lib/types";
import { useT } from "@/lib/i18n";

/** Edit profile: display name, gender, birth date, and the (tier-gated) avatar. */
function EditProfileDialog({ user }: { user: User }) {
  const t = useT();
  const updateUser = useDb((s) => s.updateUser);
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [gender, setGender] = useState<Gender>(user.gender);
  const [birthDate, setBirthDate] = useState(user.birthDate ?? "");

  const canChangeAvatar = TIERS[user.subscriptionTier].canUploadAvatar;
  const avatarInputRef = useRef<HTMLInputElement>(null);

  function save(event: React.FormEvent) {
    event.preventDefault();
    updateUser(user.id, { displayName: displayName.trim() || user.displayName, gender, birthDate });
    setOpen(false);
    toast.success(t("نمایه به‌روزرسانی شد"));
  }

  function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("لطفاً یک فایل تصویری انتخاب کنید"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      updateUser(user.id, { avatarUrl: reader.result as string });
      toast.success(t("تصویر نمایه تغییر کرد"));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Pencil />
        {t("ویرایش نمایه")}
      </Button>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("ویرایش نمایه")}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3">
          <UserAvatar
            name={displayName}
            seed={user.avatarSeed}
            url={user.avatarUrl}
            className="size-16"
          />
          {canChangeAvatar ? (
            <>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => avatarInputRef.current?.click()}
              >
                <ImagePlus />
                {t("تغییر تصویر")}
              </Button>
            </>
          ) : (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="inline-flex">
                    <Button variant="outline" size="sm" disabled>
                      <ImagePlus />
                      {t("تغییر تصویر")}
                    </Button>
                  </span>
                }
              />
              <TooltipContent>{t("برای تغییر تصویر، اشتراک خود را ارتقا دهید")}</TooltipContent>
            </Tooltip>
          )}
        </div>

        <form id="edit-profile-form" onSubmit={save} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="displayName">{t("نام نمایشی")}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="h-10"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t("جنسیت")}</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as Gender)}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">{t("زن")}</SelectItem>
                  <SelectItem value="male">{t("مرد")}</SelectItem>
                  <SelectItem value="other">{t("سایر")}</SelectItem>
                  <SelectItem value="unspecified">{t("نامشخص")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="birthDate">{t("تاریخ تولد")}</Label>
              <Input
                id="birthDate"
                type="date"
                dir="ltr"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                className="h-10"
              />
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="submit" form="edit-profile-form">
            {t("ذخیره")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ProfilePage() {
  const t = useT();
  const user = useCurrentUser();
  if (!user) return null;

  const limit = TIERS[user.subscriptionTier].dailyStreamLimit;
  const remaining = limit === UNLIMITED ? null : Math.max(0, limit - user.dailyStreams);

  return (
    <div className="space-y-8">
      <header className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-end sm:text-start">
        <UserAvatar
          name={user.displayName}
          seed={user.avatarSeed}
          url={user.avatarUrl}
          className="size-32"
        />
        <div className="flex-1 space-y-2">
          <h1 className="font-heading text-3xl font-bold">{user.displayName}</h1>
          <p className="text-sm text-muted-foreground" dir="ltr">
            {user.username}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <TierBadge tier={user.subscriptionTier} />
            <span className="text-xs text-muted-foreground">{t(ROLE_LABELS[user.role])}</span>
          </div>
        </div>
        <EditProfileDialog user={user} />
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label={t("دنبال‌کننده")} value={formatNumber(user.followerCount)} icon={Users} />
        <StatTile
          label={t("دنبال‌شونده")}
          value={formatNumber(user.followingIds.length)}
          icon={UserPlus}
        />
        <StatTile
          label={t("استریم امروز")}
          value={
            remaining === null
              ? formatNumber(user.dailyStreams)
              : `${toFaDigits(user.dailyStreams)} / ${toFaDigits(limit)}`
          }
          icon={Radio}
        />
      </div>

      {remaining !== null ? (
        <p className="text-sm text-muted-foreground">
          {remaining > 0
            ? t("امروز {n} استریم دیگر باقی مانده است.", { n: toFaDigits(remaining) })
            : t("به سقف استریم روزانه رسیده‌اید. برای استریم نامحدود، اشتراک خود را ارتقا دهید.")}
        </p>
      ) : null}
    </div>
  );
}
