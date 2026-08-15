"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n";

/** Password recovery request (mock: always shows a neutral success message). */
export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm ring-1 ring-foreground/5">
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <Brand />
        <h1 className="mt-2 font-heading text-xl font-bold">{t("بازیابی رمز عبور")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("ایمیل خود را وارد کنید تا لینک بازیابی برایتان ارسال شود.")}
        </p>
      </div>

      {sent ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-6" />
          </div>
          <p className="text-sm text-muted-foreground">
            {t("اگر حسابی با ایمیل")} <span dir="ltr">{email}</span> {t("وجود داشته باشد، لینک بازیابی ارسال شد.")}
          </p>
          <Button variant="outline" className="mt-1" render={<Link href="/login" />}>
            {t("بازگشت به ورود")}
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSent(true);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("ایمیل")}</Label>
            <Input
              id="email"
              type="email"
              dir="ltr"
              required
              className="h-10"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full">
            {t("ارسال لینک بازیابی")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="hover:text-foreground hover:underline">
              {t("بازگشت به ورود")}
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
