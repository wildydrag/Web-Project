"use client";

import { useState } from "react";
import { Crown, Lock, Sparkles, Wallet } from "lucide-react";
import { toast } from "sonner";

import { DonutChart } from "@/components/dashboard/donut-chart";
import { StatTile } from "@/components/stat-tile";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber, formatToman } from "@/lib/format";
import { useApiResource } from "@/lib/api/hooks";
import { useDb } from "@/lib/stores/db-store";
import { useCurrentUser } from "@/lib/stores/session-store";

/** Tier distribution and revenue, aggregated server-side. */
interface SubscriptionReport {
  counts: { basic: number; silver: number; gold: number };
  totalSubscribers: number;
  monthlyRevenue: number;
  prices: { silver: number; gold: number };
}

export default function SubscriptionsPage() {
  const user = useCurrentUser();
  const prices = useDb((s) => s.settings.prices);
  const updatePrices = useDb((s) => s.updatePrices);
  const { data, refresh } = useApiResource<SubscriptionReport>("/dashboard/subscriptions/");

  const [silver, setSilver] = useState(prices.silver);
  const [gold, setGold] = useState(prices.gold);

  if (!user) return null;
  if (user.role !== "admin") {
    return (
      <EmptyState
        icon={Lock}
        title="دسترسی محدود"
        description="این بخش تنها برای مدیر سامانه در دسترس است."
      />
    );
  }

  // Distribution and revenue come from the backend; no client-side reduction.
  const counts = data?.counts ?? { basic: 0, silver: 0, gold: 0 };
  const monthlyRevenue = data?.monthlyRevenue ?? 0;
  const totalSubscribers = data?.totalSubscribers ?? 0;

  function savePrices(event: React.FormEvent) {
    event.preventDefault();
    updatePrices({ silver: Math.max(0, silver), gold: Math.max(0, gold) });
    toast.success("قیمت‌ها به‌روزرسانی شد", {
      description: "قیمت‌های جدید بلافاصله در کل سامانه اعمال شد.",
    });
    refresh(); // re-pull revenue with the new prices
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">اشتراک‌ها و قیمت‌ها</h1>
        <p className="text-sm text-muted-foreground">
          قیمت اشتراک‌ها را تعیین کنید و گزارش درآمد را ببینید.
        </p>
      </div>

      {/* Revenue widgets */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="درآمد ماهانه" value={formatToman(monthlyRevenue)} icon={Wallet} />
        <StatTile label="اعضای طلایی" value={formatNumber(counts.gold)} icon={Crown} />
        <StatTile label="اعضای نقره‌ای" value={formatNumber(counts.silver)} icon={Sparkles} />
        <StatTile label="کل مشترکان" value={formatNumber(totalSubscribers)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Price control */}
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-1 font-heading text-base font-bold">کنترل قیمت‌ها</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            تغییر قیمت‌ها بلافاصله و بدون نیاز به تغییر در کد اعمال می‌شود.
          </p>
          <form onSubmit={savePrices} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="silver-price">قیمت اشتراک نقره‌ای (تومان / ماه)</Label>
              <Input
                id="silver-price"
                type="number"
                min={0}
                dir="ltr"
                className="h-10"
                value={silver}
                onChange={(event) => setSilver(Number(event.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gold-price">قیمت اشتراک طلایی (تومان / ماه)</Label>
              <Input
                id="gold-price"
                type="number"
                min={0}
                dir="ltr"
                className="h-10"
                value={gold}
                onChange={(event) => setGold(Number(event.target.value) || 0)}
              />
            </div>
            <Button type="submit">بروزرسانی قیمت‌ها</Button>
          </form>
        </section>

        {/* Tier distribution */}
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-4 font-heading text-base font-bold">توزیع کاربران</h2>
          <DonutChart
            data={[
              { label: "پایه", value: counts.basic, color: "var(--muted-foreground)" },
              { label: "نقره‌ای", value: counts.silver, color: "var(--silver)" },
              { label: "طلایی", value: counts.gold, color: "var(--gold)" },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
