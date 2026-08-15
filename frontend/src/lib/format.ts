/**
 * Locale-aware formatting helpers.
 *
 * Numbers, dates and durations follow the interface language: Persian digits
 * and the Jalali calendar under `fa-IR-u-ca-persian`, Latin digits and the
 * Gregorian calendar under `en-US`. Everything comes from the built-in `Intl`
 * APIs, so there is no extra dependency and no calendar conversion to maintain.
 *
 * These are plain functions rather than hooks so they can be called from
 * anywhere. They read the active language imperatively; the root layout remounts
 * the tree when the language changes, so every formatted value is recomputed.
 */

import { LOCALE, useLanguageStore } from "@/lib/i18n";

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

function language(): "fa" | "en" {
  return useLanguageStore.getState().language;
}

function locale(): string {
  return LOCALE[language()];
}

/** The calendar-aware locale tag — Jalali for Persian, Gregorian for English. */
function calendarLocale(): string {
  return language() === "fa" ? "fa-IR-u-ca-persian" : "en-US";
}

/**
 * Render digits in the script of the active language.
 *
 * Under Persian the Latin digits in any string become Persian ones; under
 * English the string is left as it is.
 */
export function toFaDigits(input: string | number): string {
  const text = String(input);
  if (language() === "en") return text;
  return text.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Group a number with thousands separators (۱٬۲۳۴ / 1,234). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(locale()).format(value);
}

/**
 * Compact, human-friendly counts for stats (۱٫۲ میلیون / 1.2M).
 * Falls back to the grouped form for small numbers.
 */
export function formatCompact(value: number): string {
  if (value < 1000) return formatNumber(value);
  return new Intl.NumberFormat(locale(), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/** Format a price in Toman, e.g. `۱۲۵٬۰۰۰ تومان` / `125,000 Toman`. */
export function formatToman(value: number): string {
  return `${formatNumber(value)} ${language() === "fa" ? "تومان" : "Toman"}`;
}

/** Seconds → `m:ss` (used by the player and song rows). */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return toFaDigits(`${minutes}:${seconds.toString().padStart(2, "0")}`);
}

/** A full date, e.g. `۱۴ خرداد ۱۴۰۵` / `4 June 2026`. */
export function formatDate(value: string | number | Date): string {
  return new Intl.DateTimeFormat(calendarLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

/** Short date for tables, e.g. `۱۴۰۵/۰۳/۱۴` / `06/04/2026`. */
export function formatShortDate(value: string | number | Date): string {
  return new Intl.DateTimeFormat(calendarLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

/** Just the year, e.g. `۱۴۰۴` / `2025`. */
export function formatYear(value: string | number | Date): string {
  return new Intl.DateTimeFormat(calendarLocale(), {
    year: "numeric",
  }).format(new Date(value));
}

/** Coarse "x ago" label for notifications and tickets. */
export function formatRelative(value: string | number | Date): string {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: "auto" });

  if (minutes < 1) return language() === "fa" ? "همین حالا" : "just now";
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  const days = Math.round(hours / 24);
  if (days < 30) return rtf.format(-days, "day");
  return formatDate(date);
}

/** The list separator for the active language (`الف، ب` / `a, b`). */
export function listSeparator(): string {
  return language() === "fa" ? "، " : ", ";
}
