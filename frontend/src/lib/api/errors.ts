"use client";

/**
 * Turning a thrown request error into something worth showing a user.
 *
 * The auth screens used to catch every failure and blame the credentials, so a
 * backend that was simply not running looked like a wrong password. These
 * helpers report what actually happened.
 *
 * They are called from event handlers rather than during render, so they use
 * the imperative `tr` instead of the `useT` hook.
 */

import { ApiError, BASE_URL, NetworkError } from "@/lib/api/client";
import { tr } from "@/lib/i18n";

export interface ErrorMessage {
  title: string;
  description: string;
}

function serverUnreachable(): ErrorMessage {
  return {
    title: tr("ارتباط با سرور برقرار نشد"),
    description: tr("مطمئن شوید بک‌اند در حال اجراست ({url}).", { url: BASE_URL }),
  };
}

/** Message for a failed sign-in. */
export function loginErrorMessage(error: unknown): ErrorMessage {
  if (error instanceof NetworkError) return serverUnreachable();
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        title: tr("ایمیل یا رمز عبور نادرست است"),
        description: tr("می‌توانید از حساب‌های نمایشی پایین صفحه استفاده کنید."),
      };
    }
    const message = error.firstMessage;
    if (message) return { title: tr("ورود ناموفق بود"), description: tr(message) };
  }
  return { title: tr("ورود ناموفق بود"), description: tr("لطفاً دوباره تلاش کنید.") };
}

/** Message for a failed registration. */
export function registerErrorMessage(error: unknown): ErrorMessage {
  if (error instanceof NetworkError) return serverUnreachable();
  if (error instanceof ApiError) {
    // The server validates in Persian (duplicate email, short password, bad
    // date). Its wording is shown as-is, passed through the dictionary so the
    // common cases also read correctly in English.
    const message = error.firstMessage;
    if (message) return { title: tr("ثبت‌نام ناموفق بود"), description: tr(message) };
  }
  return { title: tr("ثبت‌نام ناموفق بود"), description: tr("لطفاً دوباره تلاش کنید.") };
}
