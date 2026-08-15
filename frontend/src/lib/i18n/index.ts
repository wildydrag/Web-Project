"use client";

/**
 * Interface language.
 *
 * The chosen language is stored per account on the server (so it follows the
 * user between devices) and mirrored into `localStorage` so signed-out screens
 * such as the login page can render in the right language immediately.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DIRECTION, EN, type Language } from "./dictionary";

export type { Language };
export { DIRECTION };

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "fa",
      setLanguage: (language) => set({ language }),
    }),
    { name: "nava-language" },
  ),
);

/** Translate a Persian source string, falling back to it when untranslated. */
export function translate(text: string, language: Language): string {
  if (language === "fa") return text;
  return EN[text] ?? text;
}

/**
 * Returns `t`, which translates a Persian string into the active language.
 *
 * ```tsx
 * const t = useT();
 * <h1>{t("ورود به نوا")}</h1>
 * ```
 */
export function useT(): (text: string) => string {
  const language = useLanguageStore((s) => s.language);
  return (text: string) => translate(text, language);
}

/** The active language (and its writing direction). */
export function useLanguage(): { language: Language; dir: "rtl" | "ltr" } {
  const language = useLanguageStore((s) => s.language);
  return { language, dir: DIRECTION[language] };
}
