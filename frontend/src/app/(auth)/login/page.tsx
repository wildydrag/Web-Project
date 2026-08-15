"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/auth/demo-accounts";
import { homeRouteForRole } from "@/lib/navigation";
import { useSession } from "@/lib/stores/session-store";
import { loginErrorMessage } from "@/lib/api/errors";
import { useT } from "@/lib/i18n";

/** Shared login for all four roles (real backend auth). */

export default function LoginPage() {
  const router = useRouter();
  const login = useSession((s) => s.login);
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(targetEmail: string, targetPassword: string) {
    setBusy(true);
    try {
      const user = await login(targetEmail, targetPassword);
      toast.success(`خوش آمدید، ${user.displayName}`);
      router.replace(homeRouteForRole(user.role));
    } catch (error) {
      const { title, description } = loginErrorMessage(error);
      toast.error(title, { description });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm ring-1 ring-foreground/5">
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <Brand />
        <h1 className="mt-2 font-heading text-xl font-bold">{t("ورود به نوا")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("وارد حساب خود شوید و به موسیقی گوش دهید.")}
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void signIn(email, password);
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("ایمیل")}</Label>
          <Input
            id="email"
            type="email"
            inputMode="email"
            dir="ltr"
            required
            className="h-10"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("رمز عبور")}</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              {t("فراموشی رمز عبور؟")}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            dir="ltr"
            required
            className="h-10"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {t("ورود")}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        حساب ندارید؟{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t("ثبت‌نام")}
        </Link>
      </p>

      <div className="mt-6 border-t pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t("حساب‌های نمایشی — یک نقش در هر ردیف")}</p>
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]" dir="ltr">
            {DEMO_PASSWORD}
          </span>
        </div>

        <ul className="divide-y rounded-lg border">
          {DEMO_ACCOUNTS.map((account) => (
            <li key={account.email} className="flex items-center gap-3 p-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">
                  {account.label}
                  <span className="ms-1.5 font-normal text-muted-foreground">
                    · {account.hint}
                  </span>
                </p>
                <p className="truncate font-mono text-[10px] text-muted-foreground" dir="ltr">
                  {account.email}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                  {account.shows}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                disabled={busy}
                onClick={() => signIn(account.email, DEMO_PASSWORD)}
              >
                {t("ورود")}
              </Button>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          {t("رمز عبور همه‌ی حساب‌های بالا یکسان است.")}
        </p>
      </div>
    </div>
  );
}
