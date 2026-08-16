"use client";

import { Lock } from "lucide-react";

import { StatusPill } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber, formatToman, toFaDigits } from "@/lib/format";
import { PAYOUT_STATUS } from "@/lib/status-labels";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useT } from "@/lib/i18n";

export default function AuditingPage() {
  const t = useT();
  const user = useCurrentUser();
  const audits = useDb((s) => s.audits);
  const settlePayout = useDb((s) => s.settlePayout);
  if (!user) return null;

  if (user.role !== "admin") {
    return (
      <EmptyState
        icon={Lock}
        title={t("دسترسی محدود")}
        description={t("این بخش تنها برای مدیر سامانه در دسترس است.")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{t("حسابرسی ماهانه")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("پاداش و وضعیت تسویه‌حساب هنرمندان.")}
        </p>
      </div>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("هنرمند")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("شنوندگان یکتا")}</TableHead>
              <TableHead className="hidden sm:table-cell">{t("استریم‌ها")}</TableHead>
              <TableHead>{t("پاداش")}</TableHead>
              <TableHead>{t("وضعیت")}</TableHead>
              <TableHead className="text-end">{t("عملیات")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audits.map((row) => {
              const status = PAYOUT_STATUS[row.status];
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <p className="font-medium">{row.artistName}</p>
                    <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                      {row.artistId}
                    </p>
                  </TableCell>
                  <TableCell className="tabular hidden text-muted-foreground sm:table-cell">
                    {formatNumber(row.uniqueListeners)}
                  </TableCell>
                  <TableCell className="tabular hidden text-muted-foreground sm:table-cell">
                    {formatNumber(row.totalStreams)}
                  </TableCell>
                  <TableCell className="tabular font-medium">
                    {formatToman(row.rewardToman)}
                  </TableCell>
                  <TableCell>
                    <StatusPill label={t(status.label)} tone={status.tone} />
                  </TableCell>
                  <TableCell className="text-end">
                    {row.status === "pending" ? (
                      <Button size="sm" onClick={() => settlePayout(row.id)}>
                        {t("تایید تسویه")}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">{t("تسویه‌شده")}</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("پاداش هنرمندان بر اساس استریم‌های ثبت‌شده در همان دوره محاسبه می‌شود.")}
        {t("دوره: {period}", { period: toFaDigits(audits[0]?.period ?? "—") })}
      </p>
    </div>
  );
}
