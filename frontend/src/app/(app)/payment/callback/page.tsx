"use client";

/**
 * Where ZarinPal sends the browser after payment.
 *
 * The gateway appends `Authority` (the transaction token) and `Status` (`OK` or
 * `NOK`) to this URL. Neither is trusted: the page hands both to the API, which
 * re-asks ZarinPal whether the money actually arrived and only then activates
 * the subscription. A user who edits the query string gets nothing.
 */

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api/client";
import { useT } from "@/lib/i18n";
import { useSession } from "@/lib/stores/session-store";

interface VerifyResponse {
  status: "pending" | "success" | "failed";
  payment?: { refId?: string; amount?: number };
}

type Outcome =
  | { state: "checking" }
  | { state: "success"; refId: string }
  | { state: "failed"; reason?: string };

function PaymentCallback() {
  const t = useT();
  const params = useSearchParams();
  const bootstrap = useSession((s) => s.bootstrap);
  const authority = params.get("Authority") ?? "";
  const status = params.get("Status") ?? "";

  // Landing here without a transaction token is a failure we already know
  // about, so it is the initial state rather than something an effect sets.
  const [outcome, setOutcome] = useState<Outcome>(
    authority ? { state: "checking" } : { state: "failed" },
  );

  useEffect(() => {
    if (!authority) return;

    let cancelled = false;
    api
      .post<VerifyResponse>("/subscriptions/verify/", { authority, status })
      .then(async (result) => {
        if (cancelled) return;
        if (result.status === "success") {
          setOutcome({ state: "success", refId: result.payment?.refId ?? "" });
          await bootstrap(); // pull the account back down with its new tier
        } else {
          setOutcome({ state: "failed" });
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setOutcome({
          state: "failed",
          reason: error instanceof ApiError ? error.firstMessage ?? undefined : undefined,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [authority, status, bootstrap]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      {outcome.state === "checking" ? (
        <>
          <Loader2 className="size-10 animate-spin text-muted-foreground" />
          <h1 className="font-heading text-xl font-bold">{t("در حال بررسی پرداخت…")}</h1>
        </>
      ) : outcome.state === "success" ? (
        <>
          <CheckCircle2 className="size-12 text-green-600" />
          <h1 className="font-heading text-xl font-bold">{t("پرداخت موفق بود")}</h1>
          <p className="text-sm text-muted-foreground">{t("اشتراک شما فعال شد.")}</p>
          {outcome.refId ? (
            <p className="font-mono text-xs text-muted-foreground" dir="ltr">
              {t("شماره پیگیری: {ref}", { ref: outcome.refId })}
            </p>
          ) : null}
        </>
      ) : (
        <>
          <XCircle className="size-12 text-destructive" />
          <h1 className="font-heading text-xl font-bold">{t("پرداخت ناموفق بود")}</h1>
          <p className="text-sm text-muted-foreground">
            {outcome.reason ?? t("پرداخت شما تکمیل نشد.")}
          </p>
        </>
      )}

      <Button
        variant={outcome.state === "success" ? "default" : "outline"}
        render={<Link href="/settings" />}
      >
        {t("بازگشت به تنظیمات")}
      </Button>
    </div>
  );
}

export default function PaymentCallbackPage() {
  // `useSearchParams` needs a Suspense boundary to keep the route statically
  // renderable up to the point the query string is read.
  return (
    <Suspense fallback={null}>
      <PaymentCallback />
    </Suspense>
  );
}
