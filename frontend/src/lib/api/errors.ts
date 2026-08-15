"use client";

/**
 * Turning a thrown request error into something worth showing a user.
 *
 * The auth screens used to catch every failure and blame the credentials, so a
 * backend that was simply not running looked like a wrong password. These
 * helpers report what actually happened.
 */

import { ApiError, BASE_URL, NetworkError } from "@/lib/api/client";

export interface ErrorMessage {
  title: string;
  description: string;
}

const SERVER_UNREACHABLE: ErrorMessage = {
  title: "ارتباط با سرور برقرار نشد",
  description: `مطمئن شوید بک‌اند در حال اجراست (${BASE_URL}).`,
};

/** Message for a failed sign-in. */
export function loginErrorMessage(error: unknown): ErrorMessage {
  if (error instanceof NetworkError) return SERVER_UNREACHABLE;
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return {
        title: "ایمیل یا رمز عبور نادرست است",
        description: "می‌توانید از حساب‌های نمایشی پایین صفحه استفاده کنید.",
      };
    }
    const message = error.firstMessage;
    if (message) return { title: "ورود ناموفق بود", description: message };
  }
  return { title: "ورود ناموفق بود", description: "لطفاً دوباره تلاش کنید." };
}

/** Message for a failed registration. */
export function registerErrorMessage(error: unknown): ErrorMessage {
  if (error instanceof NetworkError) return SERVER_UNREACHABLE;
  if (error instanceof ApiError) {
    // The server already validates in Persian (duplicate email, short
    // password, bad date) — show its wording rather than guessing.
    const message = error.firstMessage;
    if (message) return { title: "ثبت‌نام ناموفق بود", description: message };
  }
  return { title: "ثبت‌نام ناموفق بود", description: "لطفاً دوباره تلاش کنید." };
}
