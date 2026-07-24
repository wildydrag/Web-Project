"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Brand } from "@/components/brand";
import { PrivacyPolicyDialog } from "@/components/privacy-policy-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/lib/stores/session-store";

// ── Validation schemas ──────────────────────────────────────────────────────

const listenerSchema = z
  .object({
    displayName: z.string().min(2, "نام نمایشی حداقل ۲ حرف باشد"),
    email: z.string().email("ایمیل نامعتبر است"),
    password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر باشد"),
    confirm: z.string(),
    birthDate: z.string().min(1, "تاریخ تولد را وارد کنید"),
    gender: z.enum(["female", "male", "other", "unspecified"]),
    privacy: z.boolean().refine((v) => v, "پذیرش سیاست حریم خصوصی الزامی است"),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "رمز عبور و تکرار آن یکسان نیست",
  });

const artistSchema = z.object({
  name: z.string().min(2, "نام هنری حداقل ۲ حرف باشد"),
  email: z.string().email("ایمیل نامعتبر است"),
  password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر باشد"),
  portfolio: z.string().min(5, "نمونه‌کارها (لینک یا توضیح) را وارد کنید"),
});

type ListenerForm = z.infer<typeof listenerSchema>;
type ArtistForm = z.infer<typeof artistSchema>;

/** Small inline validation message. */
function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

// ── Listener sign-up ─────────────────────────────────────────────────────────

function ListenerSignUp() {
  const router = useRouter();
  const registerListener = useSession((s) => s.registerListener);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ListenerForm>({
    resolver: zodResolver(listenerSchema),
    defaultValues: { gender: "unspecified", privacy: false },
  });

  async function onSubmit(data: ListenerForm) {
    try {
      await registerListener({
        displayName: data.displayName,
        email: data.email,
        password: data.password,
        gender: data.gender,
        birthDate: data.birthDate,
      });
      toast.success("حساب شما ساخته شد. خوش آمدید!");
      router.replace("/home");
    } catch {
      toast.error("ثبت‌نام ناموفق بود", {
        description: "ممکن است این ایمیل قبلاً ثبت شده باشد.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <div className="space-y-1.5">
        <Label htmlFor="displayName">نام نمایشی</Label>
        <Input id="displayName" className="h-10" {...register("displayName")} />
        <FieldError message={errors.displayName?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reg-email">ایمیل</Label>
        <Input id="reg-email" type="email" dir="ltr" className="h-10" {...register("email")} />
        <FieldError message={errors.email?.message} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="reg-password">رمز عبور</Label>
          <Input
            id="reg-password"
            type="password"
            dir="ltr"
            className="h-10"
            {...register("password")}
          />
          <FieldError message={errors.password?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">تکرار رمز عبور</Label>
          <Input
            id="confirm"
            type="password"
            dir="ltr"
            className="h-10"
            {...register("confirm")}
          />
          <FieldError message={errors.confirm?.message} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="birthDate">تاریخ تولد</Label>
          <Input
            id="birthDate"
            type="date"
            dir="ltr"
            className="h-10"
            {...register("birthDate")}
          />
          <FieldError message={errors.birthDate?.message} />
        </div>
        <div className="space-y-1.5">
          <Label>جنسیت</Label>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-10 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">زن</SelectItem>
                  <SelectItem value="male">مرد</SelectItem>
                  <SelectItem value="other">سایر</SelectItem>
                  <SelectItem value="unspecified">ترجیح می‌دهم نگویم</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <Controller
            control={control}
            name="privacy"
            render={({ field }) => (
              <Checkbox
                id="privacy"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
                className="mt-0.5"
              />
            )}
          />
          <Label htmlFor="privacy" className="text-sm leading-snug font-normal">
            <PrivacyPolicyDialog /> را خوانده‌ام و می‌پذیرم.
          </Label>
        </div>
        <FieldError message={errors.privacy?.message} />
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        ساخت حساب و ورود
      </Button>
    </form>
  );
}

// ── Artist sign-up ───────────────────────────────────────────────────────────

function ArtistSignUp() {
  const router = useRouter();
  const registerArtist = useSession((s) => s.registerArtist);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ArtistForm>({ resolver: zodResolver(artistSchema) });

  async function onSubmit(data: ArtistForm) {
    try {
      await registerArtist({
        name: data.name,
        email: data.email,
        password: data.password,
        portfolio: data.portfolio,
      });
      toast.success("درخواست هنرمندی ثبت شد", {
        description: "حساب شما در وضعیت «در انتظار تایید» قرار گرفت.",
      });
      router.replace("/home");
    } catch {
      toast.error("ثبت‌نام ناموفق بود", {
        description: "ممکن است این ایمیل قبلاً ثبت شده باشد.",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
      <div className="space-y-1.5">
        <Label htmlFor="artist-name">نام هنری</Label>
        <Input id="artist-name" className="h-10" {...register("name")} />
        <FieldError message={errors.name?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="artist-email">ایمیل</Label>
        <Input
          id="artist-email"
          type="email"
          dir="ltr"
          className="h-10"
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="artist-password">رمز عبور</Label>
        <Input
          id="artist-password"
          type="password"
          dir="ltr"
          className="h-10"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="portfolio">نمونه‌کارها</Label>
        <Input
          id="portfolio"
          className="h-10"
          placeholder="لینک به آثار یا توضیح کوتاه"
          {...register("portfolio")}
        />
        <FieldError message={errors.portfolio?.message} />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
        ارسال درخواست هنرمندی
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        پس از بررسی توسط پشتیبانان، نتیجه به شما اطلاع داده می‌شود.
      </p>
    </form>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm ring-1 ring-foreground/5">
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <Brand />
        <h1 className="mt-2 font-heading text-xl font-bold">ساخت حساب</h1>
        <p className="text-sm text-muted-foreground">به نوا بپیوندید.</p>
      </div>

      <Tabs defaultValue="listener">
        <TabsList className="w-full">
          <TabsTrigger value="listener" className="flex-1">
            کاربر عادی
          </TabsTrigger>
          <TabsTrigger value="artist" className="flex-1">
            هنرمند
          </TabsTrigger>
        </TabsList>
        <TabsContent value="listener" className="pt-4">
          <ListenerSignUp />
        </TabsContent>
        <TabsContent value="artist" className="pt-4">
          <ArtistSignUp />
        </TabsContent>
      </Tabs>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        حساب دارید؟{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          ورود
        </Link>
      </p>
    </div>
  );
}
