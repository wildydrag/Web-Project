"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_ACCOUNTS } from "@/lib/auth/demo-accounts";
import { homeRouteForRole } from "@/lib/navigation";
import { useSession } from "@/lib/stores/session-store";

/** Shared login for all four roles (real backend auth). */
const DEMO_PASSWORD = "nava1234";

export default function LoginPage() {
  const router = useRouter();
  const login = useSession((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(targetEmail: string, targetPassword: string) {
    setBusy(true);
    try {
      const user = await login(targetEmail, targetPassword);
      toast.success(`خوش آمدید، ${user.displayName}`);
      router.replace(homeRouteForRole(user.role));
    } catch {
      toast.error("ایمیل یا رمز عبور نادرست است", {
        description: "می‌توانید از حساب‌های نمایشی پایین صفحه استفاده کنید.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm ring-1 ring-foreground/5">
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <Brand />
        <h1 className="mt-2 font-heading text-xl font-bold">ورود به نوا</h1>
        <p className="text-sm text-muted-foreground">
          وارد حساب خود شوید و به موسیقی گوش دهید.
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
          <Label htmlFor="email">ایمیل</Label>
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
            <Label htmlFor="password">رمز عبور</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              فراموشی رمز عبور؟
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
          ورود
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        حساب ندارید؟{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          ثبت‌نام
        </Link>
      </p>

      <div className="mt-6 border-t pt-4">
        <p className="mb-2 text-center text-xs text-muted-foreground">
          ورود سریع نمایشی (برای هر نقش)
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {DEMO_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              type="button"
              variant="outline"
              className="h-auto flex-col items-start gap-0.5 py-1.5"
              disabled={busy}
              onClick={() => signIn(account.email, DEMO_PASSWORD)}
            >
              <span className="text-xs font-medium">{account.label}</span>
              <span className="text-[10px] text-muted-foreground">{account.hint}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
