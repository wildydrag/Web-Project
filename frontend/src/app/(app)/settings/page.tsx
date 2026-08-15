"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  SubscriptionCheckoutDialog,
  usePaymentCallback,
} from "@/components/subscription-checkout-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { TierBadge } from "@/components/tier-badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TIERS, TIER_ORDER, UNLIMITED } from "@/lib/config";
import { formatToman, toFaDigits } from "@/lib/format";
import { useDb } from "@/lib/stores/db-store";
import { useLanguageStore } from "@/lib/i18n";
import { usePlayer } from "@/lib/stores/player-store";
import { useCurrentUser } from "@/lib/stores/session-store";
import { useSession } from "@/lib/stores/session-store";
import type { SubscriptionTier, UserPreferences } from "@/lib/types";
import { cn } from "@/lib/utils";

/** A labeled settings row (label + description on one side, control on the other). */
function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="mb-1 font-heading text-base font-bold">{title}</h2>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

function tierPrice(tier: SubscriptionTier, prices: { silver: number; gold: number }) {
  if (tier === "basic") return "رایگان";
  return `${formatToman(prices[tier])} / ماه`;
}

export default function SettingsPage() {
  const user = useCurrentUser();
  const prices = useDb((s) => s.settings.prices);
  const updateUser = useDb((s) => s.updateUser);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const deleteUser = useDb((s) => s.deleteUser);
  const logout = useSession((s) => s.logout);
  const volume = usePlayer((s) => s.volume);
  const setVolume = usePlayer((s) => s.setVolume);
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  // Tier the user is buying; opens the checkout dialog when set.
  const [checkoutTier, setCheckoutTier] = useState<SubscriptionTier | null>(null);

  // Finish a payment when the gateway redirects back to this page.
  usePaymentCallback();

  if (!user) return null;

  function setPref(patch: Partial<UserPreferences>) {
    updateUser(user!.id, { preferences: { ...user!.preferences, ...patch } });
  }

  function chooseTier(tier: SubscriptionTier) {
    if (tier === user!.subscriptionTier) return;
    if (tier === "basic") {
      // Downgrades are not a purchase: the paid plan simply stops renewing.
      toast.info("اشتراک پایه", {
        description: "با پایان دوره‌ی فعلی، اشتراک شما تمدید نمی‌شود.",
      });
      return;
    }
    setCheckoutTier(tier); // paid tiers go through the payment gateway
  }

  function deleteAccount() {
    const id = user!.id;
    setDeleteOpen(false);
    logout();
    deleteUser(id);
    router.replace("/login");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-heading text-2xl font-bold">تنظیمات</h1>

      <SectionCard title="عمومی">
        <SettingRow
          title="اعلان‌ها"
          description="دریافت اعلان‌های سامانه"
          control={
            <Switch
              checked={user.preferences.notificationsEnabled}
              onCheckedChange={(v) => setPref({ notificationsEnabled: v === true })}
            />
          }
        />
        <SettingRow
          title="زبان"
          control={
            <Select
              value={user.preferences.language}
              onValueChange={(v) => {
                const language = v as "fa" | "en";
                setLanguage(language); // switch the interface now
                setPref({ language }); // and remember it on the server
              }}
            >
              <SelectTrigger className="h-9 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fa">فارسی</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <SettingRow title="پوسته" description="روشن یا تیره" control={<ThemeToggle />} />
        <SettingRow
          title="صدای سامانه"
          description={`میزان صدا: ${toFaDigits(volume)}٪`}
          control={
            <div dir="ltr" className="w-40">
              <Slider
                value={[volume]}
                max={100}
                step={1}
                onValueChange={(v) => setVolume(Array.isArray(v) ? v[0] : v)}
                aria-label="میزان صدای سامانه"
              />
            </div>
          }
        />
      </SectionCard>

      <SectionCard title="اشتراک">
        <div className="flex items-center justify-between py-3">
          <p className="text-sm">اشتراک فعلی</p>
          <TierBadge tier={user.subscriptionTier} />
        </div>
        <div className="grid gap-3 pt-3 sm:grid-cols-3">
          {TIER_ORDER.map((tier) => {
            const benefits = TIERS[tier];
            const current = user.subscriptionTier === tier;
            return (
              <div
                key={tier}
                className={cn(
                  "flex flex-col rounded-xl border p-4",
                  current ? "border-primary ring-1 ring-primary/30" : "border-border",
                  tier === "gold" && "border-gold/30",
                )}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  {tier === "gold" ? <Crown className="size-4 text-gold" /> : null}
                  <span className="font-medium">{benefits.label}</span>
                </div>
                <p className="mb-3 text-sm text-muted-foreground">
                  {tierPrice(tier, prices)}
                </p>
                <ul className="mb-4 flex-1 space-y-1 text-xs text-muted-foreground">
                  <li>
                    استریم:{" "}
                    {benefits.dailyStreamLimit === UNLIMITED
                      ? "نامحدود"
                      : `${toFaDigits(benefits.dailyStreamLimit)} در روز`}
                  </li>
                  <li>
                    پلی‌لیست:{" "}
                    {benefits.playlistLimit === UNLIMITED
                      ? "نامحدود"
                      : toFaDigits(benefits.playlistLimit)}
                  </li>
                  {benefits.canDownload ? <li>دانلود آهنگ</li> : null}
                  {benefits.earlyAccess ? <li>دسترسی زودهنگام</li> : null}
                  {benefits.canViewStats ? <li>مشاهده آمار</li> : null}
                </ul>
                <Button
                  size="sm"
                  variant={current ? "outline" : "default"}
                  disabled={current}
                  onClick={() => chooseTier(tier)}
                >
                  {current ? (
                    <>
                      <Check />
                      فعال
                    </>
                  ) : (
                    "انتخاب"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="pt-3 text-xs text-muted-foreground">
          پرداخت و اتصال به درگاه در فاز دوم انجام می‌شود.
        </p>
      </SectionCard>

      <SectionCard title="حساب کاربری">
        <SettingRow
          title="حذف حساب"
          description="حساب و داده‌های شما برای همیشه حذف می‌شود."
          control={
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 />
              حذف حساب
            </Button>
          }
        />
      </SectionCard>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف حساب کاربری؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عمل قابل بازگشت نیست و تمام پلی‌لیست‌ها و اطلاعات شما حذف می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteAccount}>
              حذف حساب
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SubscriptionCheckoutDialog
        tier={checkoutTier}
        onClose={() => setCheckoutTier(null)}
      />
    </div>
  );
}
