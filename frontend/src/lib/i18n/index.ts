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

import { DIRECTION, EN, LOCALE, type Language } from "./dictionary";

export type { Language };
export { DIRECTION, LOCALE };

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

/** Values substituted into `{placeholder}` slots. */
export type Vars = Record<string, string | number>;

function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, key) =>
    key in vars ? String(vars[key]) : whole,
  );
}

/**
 * Translate a Persian source string, falling back to it when untranslated.
 *
 * Placeholders survive translation, so a sentence whose word order differs
 * between the two languages still reads correctly:
 * `translate("{n} آهنگ", "en", { n: 5 })` → `"5 tracks"`.
 */
export function translate(text: string, language: Language, vars?: Vars): string {
  return interpolate(language === "fa" ? text : EN[text] ?? text, vars);
}

/**
 * Returns `t`, which translates a Persian string into the active language.
 *
 * ```tsx
 * const t = useT();
 * <h1>{t("ورود به نوا")}</h1>
 * ```
 */
export function useT(): (text: string, vars?: Vars) => string {
  const language = useLanguageStore((s) => s.language);
  return (text: string, vars?: Vars) => translate(text, language, vars);
}

/**
 * Translate outside a component — for toasts fired from stores and helpers,
 * where there is no render to hang a hook off. Reads the store imperatively so
 * it always reflects the language in force at the moment it is called.
 */
export function tr(text: string, vars?: Vars): string {
  return translate(text, useLanguageStore.getState().language, vars);
}

/** The active language (and its writing direction). */
export function useLanguage(): { language: Language; dir: "rtl" | "ltr"; locale: string } {
  const language = useLanguageStore((s) => s.language);
  return { language, dir: DIRECTION[language], locale: LOCALE[language] };
}

/**
 * The physical edges that correspond to the reading direction.
 *
 * Layout is handled by CSS logical properties almost everywhere, but a few
 * components — the slide-in sheets in particular — need a literal `"left"` or
 * `"right"`. `start` is the edge reading begins from (right in Persian, left in
 * English), so a navigation drawer anchored to `start` opens from the side the
 * menu button sits on in both languages.
 */
export function edgesFor(language: Language): Edges {
  return DIRECTION[language] === "rtl"
    ? { start: "right", end: "left" }
    : { start: "left", end: "right" };
}

export interface Edges {
  start: "left" | "right";
  end: "left" | "right";
}

export function useEdges(): Edges {
  return edgesFor(useLanguageStore((s) => s.language));
}
