"use client";

import { useEffect } from "react";

import { DIRECTION, useLanguageStore } from "@/lib/i18n";

/**
 * Keeps `<html lang>` and `<html dir>` in step with the chosen language.
 *
 * The root layout is a Server Component and renders Persian/RTL by default;
 * this flips the document to LTR when English is selected, so the whole layout
 * mirrors rather than only the text changing. Renders nothing.
 */
export function LanguageSync() {
  const language = useLanguageStore((s) => s.language);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = DIRECTION[language];
  }, [language]);

  return null;
}
