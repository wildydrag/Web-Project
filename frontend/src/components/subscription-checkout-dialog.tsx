"use client";

/**
 * Subscription checkout.
 *
 * Picking a paid tier opens this dialog to choose a billing period, then asks
 * the backend to open a payment transaction and forwards the browser to the
 * gateway. Verification happens after the gateway redirects back — see
 * {@link usePaymentCallback}.
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, api } from "@/lib/api/client";
import { useApiResource } from "@/lib/api/hooks";
import { TIERS } from "@/lib/config";
import { formatNumber, formatToman } from "@/lib/format";
import { useSession } from "@/lib/stores/session-store";
import type { SubscriptionTier } from "@/lib/types";
import { tr, useT } from "@/lib/i18n";

interface Plans {
  prices: { silver: number; gold: number };
  billingPeriods: number[];
}

interface CheckoutResponse {
  paymentId: string;
  authority: string;
  redirectUrl: string;
}

export function SubscriptionCheckoutDialog({
  tier,
  onClose,
}: {
  tier: SubscriptionTier | null;
  onClose: () => void;
}) {
  const t = useT();
  const { data: plans } = useApiResource<Plans>("/subscriptions/plans/");
  const [period, setPeriod] = useState(1);
  const [busy, setBusy] = useState(false);

  const paidTier = tier === "silver" || tier === "gold" ? tier : null;
  const unitPrice = paidTier && plans ? plans.prices[paidTier] : 0;
  const periods = plans?.billingPeriods ?? [1, 3, 6, 12];

  async function pay() {
    if (!paidTier) return;
    setBusy(true);
    try {
      const { redirectUrl } = await api.post<CheckoutResponse>(
        "/subscriptions/checkout/",
        { tier: paidTier, billingPeriod: period },
      );
      toast.info(t("در حال انتقال به درگاه…"));
      // Leave the app for ZarinPal; we return via the callback URL.
      window.location.href = redirectUrl;
    } catch (error) {
      // The API answers 502 with the gateway's own reason when ZarinPal is
      // unreachable or refuses the request — worth showing rather than hiding.
      toast.error(t("شروع پرداخت ناموفق بود"), {
        description:
          error instanceof ApiError ? error.firstMessage ?? undefined : undefined,
      });
      setBusy(false);
    }
  }

  return (
    <Dialog open={paidTier !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("خرید اشتراک {tier}", { tier: paidTier ? t(TIERS[paidTier].label) : "" })}
          </DialogTitle>
          <DialogDescription>
            {t("مدت اشتراک را انتخاب کنید و به درگاه پرداخت بروید.")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {periods.map((months) => (
            <button
              key={months}
              type="button"
              onClick={() => setPeriod(months)}
              className={`rounded-xl border p-3 text-start transition-colors ${
                period === months ? "border-primary bg-primary/5" : "hover:bg-accent/50"
              }`}
            >
              <p className="font-medium">{t("{n} ماه", { n: formatNumber(months) })}</p>
              <p className="text-xs text-muted-foreground">
                {formatToman(unitPrice * months)}
              </p>
            </button>
          ))}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="ghost">{t("انصراف")}</Button>} />
          <Button onClick={pay} disabled={busy || !plans}>
            {t("پرداخت {amount}", { amount: formatToman(unitPrice * period) })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Completes a payment after the gateway redirects back with `Authority`/`Status`.
 * Verification is server-side: we never trust the query string alone.
 */
export function usePaymentCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const bootstrap = useSession((s) => s.bootstrap);

  useEffect(() => {
    const authority = params.get("Authority");
    if (!authority) return;
    const status = params.get("Status") ?? "";

    api
      .post<{ status: string }>("/subscriptions/verify/", { authority, status })
      .then(async (result) => {
        if (result.status === "success") {
          toast.success(tr("پرداخت موفق بود"), {
            description: tr("اشتراک شما فعال شد."),
          });
          await bootstrap(); // refresh the account with its new tier
        } else {
          toast.error(tr("پرداخت ناموفق بود"));
        }
      })
      .catch(() => toast.error(tr("بررسی پرداخت ناموفق بود")))
      .finally(() => router.replace("/settings"));
  }, [params, router, bootstrap]);
}
