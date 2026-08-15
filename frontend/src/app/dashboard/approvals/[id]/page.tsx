"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

import { NotFoundBlock } from "@/components/not-found-block";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { byId } from "@/lib/data/selectors";
import { formatDate } from "@/lib/format";
import { useDb } from "@/lib/stores/db-store";
import { useT } from "@/lib/i18n";

const isUrl = (value: string) => /^https?:\/\//i.test(value);

export default function ApprovalDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const artists = useDb((s) => s.artists);
  const users = useDb((s) => s.users);
  const approveArtist = useDb((s) => s.approveArtist);
  const rejectArtist = useDb((s) => s.rejectArtist);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const artist = byId(artists, id);
  if (!artist) return <NotFoundBlock title={t("درخواست یافت نشد")} backHref="/dashboard/approvals" />;

  const email = byId(users, artist.userId)?.email ?? "—";
  const portfolioItems = artist.portfolio
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const processed = artist.status !== "pending";

  function approve() {
    approveArtist(artist!.id);
    toast.success(t("{name} تایید شد", { name: artist!.name }));
    router.replace("/dashboard/approvals");
  }

  function reject(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) return;
    rejectArtist(artist!.id, trimmed);
    toast.success(t("درخواست رد شد"));
    router.replace("/dashboard/approvals");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/approvals"
        className="text-sm text-muted-foreground hover:text-foreground hover:underline"
      >
        {t("بازگشت به درخواست‌ها")}
      </Link>

      <div className="flex items-center gap-4">
        <UserAvatar name={artist.name} seed={artist.avatarSeed} className="size-16" />
        <div>
          <h1 className="font-heading text-2xl font-bold">{artist.name}</h1>
          <p className="text-sm text-muted-foreground" dir="ltr">
            {email}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("تاریخ درخواست: {date}", { date: formatDate(artist.requestedAt) })}
          </p>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-2 font-medium">{t("نمونه‌کارها")}</h2>
        {portfolioItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("موردی ثبت نشده است.")}</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {portfolioItems.map((item, i) =>
              isUrl(item) ? (
                <li key={i}>
                  <a
                    href={item}
                    target="_blank"
                    rel="noreferrer"
                    dir="ltr"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLink className="size-3.5" />
                    {item}
                  </a>
                </li>
              ) : (
                <li key={i} className="text-muted-foreground">
                  {item}
                </li>
              ),
            )}
          </ul>
        )}
      </section>

      {processed ? (
        <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          {t("این درخواست قبلاً {status} شده است.", {
              status: artist.status === "approved" ? t("تایید شده") : t("رد شده"),
            })}
        </div>
      ) : (
        <div className="flex gap-2">
          <Button onClick={approve}>
            <Check />
            {t("تایید درخواست")}
          </Button>
          <Button variant="destructive" onClick={() => setRejectOpen(true)}>
            <X />
            {t("رد درخواست")}
          </Button>
        </div>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("رد درخواست")}</DialogTitle>
          </DialogHeader>
          <form id="reject-form" onSubmit={reject} className="space-y-1.5">
            <Label htmlFor="reason">{t("دلیل رد")}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              placeholder={t("دلیل رد به هنرمند اطلاع داده می‌شود.")}
            />
          </form>
          <DialogFooter>
            <Button type="submit" form="reject-form" variant="destructive">
              {t("ثبت و رد درخواست")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
