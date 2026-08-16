"use client";

import { useRouter } from "next/navigation";

import { StatusPill } from "@/components/dashboard/status-pill";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatShortDate } from "@/lib/format";
import { TICKET_STATUS } from "@/lib/status-labels";
import { useDb } from "@/lib/stores/db-store";
import { Inbox } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function TicketsPage() {
  const t = useT();
  const router = useRouter();
  const tickets = useDb((s) => s.tickets);

  const sorted = tickets
    .slice()
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">{t("تیکت‌های پشتیبانی")}</h1>
        <p className="text-sm text-muted-foreground">{t("به سوالات کاربران پاسخ دهید.")}</p>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Inbox} title={t("تیکتی وجود ندارد")} />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("شناسه")}</TableHead>
                <TableHead>{t("کاربر")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("ایمیل")}</TableHead>
                <TableHead>{t("موضوع")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("تاریخ")}</TableHead>
                <TableHead>{t("وضعیت")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((ticket) => {
                const status = TICKET_STATUS[ticket.status];
                return (
                  <TableRow
                    key={ticket.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/tickets/${ticket.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground" dir="ltr">
                      {ticket.id}
                    </TableCell>
                    <TableCell>{ticket.userName}</TableCell>
                    <TableCell
                      className="hidden text-muted-foreground md:table-cell"
                      dir="ltr"
                    >
                      {ticket.userEmail ?? "—"}
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate">{ticket.subject}</TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {formatShortDate(ticket.createdAt)}
                    </TableCell>
                    <TableCell>
                      <StatusPill label={t(status.label)} tone={status.tone} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
