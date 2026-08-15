"use client";

import { useEffect, type ReactNode } from "react";

import { DIRECTION, LOCALE, useLanguageStore } from "@/lib/i18n";

/**
 * Keeps the document in step with the chosen language, and remounts the tree
 * when it changes.
 *
 * The root layout is a Server Component that renders Persian/RTL by default.
 * This flips `<html lang>` and `<html dir>` to English/LTR when English is
 * selected, so the whole layout mirrors rather than only the text changing.
 *
 * Children are keyed on the language so that switching remounts everything
 * below. That matters because the formatting helpers in `lib/format` read the
 * language imperatively rather than through a hook: a component that shows a
 * date but no translated text would otherwise keep its Persian digits until
 * something else happened to re-render it.
 */
export function LanguageSync({ children }: { children?: ReactNode }) {
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = DIRECTION[language];
    // Tells the browser which script to expect, so it picks the right font and
    // digit shaping for form controls and the date picker.
    root.setAttribute("data-locale", LOCALE[language]);
  }, [language]);

  return <div key={language} className="contents">{children}</div>;
}
