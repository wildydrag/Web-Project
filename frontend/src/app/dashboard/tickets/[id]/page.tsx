"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Send } from "lucide-react";

import { StatusPill } from "@/components/dashboard/status-pill";
import { NotFoundBlock } from "@/components/not-found-block";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { byId } from "@/lib/data/selectors";
import { formatRelative } from "@/lib/format";
import { TICKET_STATUS } from "@/lib/status-labels";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

export default function TicketDetailPage() {
  const t = useT();
  const { id } = useParams<{ id: string }>();
  const tickets = useDb((s) => s.tickets);
  const replyToTicket = useDb((s) => s.replyToTicket);
  const setTicketStatus = useDb((s) => s.setTicketStatus);
  const user = useCurrentUser();
  const [reply, setReply] = useState("");

  const ticket = byId(tickets, id);
  if (!ticket || !user) return <NotFoundBlock title={t("تیکت یافت نشد")} backHref="/dashboard/tickets" />;

  const status = TICKET_STATUS[ticket.status];

  function send(event: React.FormEvent) {
    event.preventDefault();
    const body = reply.trim();
    if (!body) return;
    replyToTicket(ticket!.id, body, user!.displayName);
    setReply("");
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4">
      <div>
        <Link
          href="/dashboard/tickets"
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          {t("بازگشت به تیکت‌ها")}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold">{ticket.subject}</h1>
            <p className="text-sm text-muted-foreground">
              <span dir="ltr" className="font-mono">
                {ticket.id}
              </span>{" "}
              · {ticket.userName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill label={t(status.label)} tone={status.tone} />
            {ticket.status !== "closed" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTicketStatus(ticket.id, "closed")}
              >
                {t("بستن تیکت")}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTicketStatus(ticket.id, "open")}
              >
                {t("بازگشایی")}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="scrollbar-slim flex-1 space-y-3 overflow-y-auto rounded-xl border bg-card p-4">
        {ticket.messages.map((message) => {
          const fromSupport = message.authorRole === "support";
          return (
            <div
              key={message.id}
              className={cn("flex flex-col gap-1", fromSupport ? "items-start" : "items-end")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                  fromSupport
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {message.body}
              </div>
              <span className="text-xs text-muted-foreground">
                {message.authorName} · {formatRelative(message.createdAt)}
              </span>
            </div>
          );
        })}
      </div>

      {ticket.status !== "closed" ? (
        <form onSubmit={send} className="flex items-end gap-2">
          <Textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder={t("پاسخ خود را بنویسید…")}
            rows={2}
            className="flex-1 resize-none"
          />
          <Button type="submit" size="icon-lg" aria-label={t("ارسال پاسخ")}>
            <Send />
          </Button>
        </form>
      ) : (
        <p className="text-center text-sm text-muted-foreground">{t("این تیکت بسته شده است.")}</p>
      )}
    </div>
  );
}
