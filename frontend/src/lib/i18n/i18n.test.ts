import { beforeEach, describe, expect, it } from "vitest";

import { DIRECTION, translate, useLanguageStore } from "@/lib/i18n";
import { EN } from "@/lib/i18n/dictionary";

beforeEach(() => {
  useLanguageStore.setState({ language: "fa" });
});

describe("translate", () => {
  it("leaves Persian untouched", () => {
    expect(translate("خانه", "fa")).toBe("خانه");
  });

  it("returns the English text when the interface is English", () => {
    expect(translate("خانه", "en")).toBe("Home");
    expect(translate("ورود", "en")).toBe("Sign in");
  });

  it("falls back to the Persian source when a string is untranslated", () => {
    // Missing entries must degrade to readable Persian, never to a raw key.
    expect(translate("یک رشته‌ی ترجمه‌نشده", "en")).toBe("یک رشته‌ی ترجمه‌نشده");
  });

  it("covers the navigation labels, which drive both sidebars", () => {
    for (const label of [
      "خانه", "آلبوم‌ها و تک‌آهنگ‌ها", "پلی‌لیست‌ها", "مدیریت آثار",
      "نمایه من", "اعلانات", "تنظیمات",
      "نمای کلی", "تیکت‌ها", "احراز هویت هنرمندان", "حسابرسی", "اشتراک‌ها و قیمت‌ها",
    ]) {
      expect(EN[label], `missing translation for ${label}`).toBeTruthy();
    }
  });

  it("has no empty translations", () => {
    for (const [fa, en] of Object.entries(EN)) {
      expect(en.trim(), `empty translation for ${fa}`).not.toBe("");
    }
  });
});

describe("writing direction", () => {
  it("flips the layout with the language", () => {
    expect(DIRECTION.fa).toBe("rtl");
    expect(DIRECTION.en).toBe("ltr");
  });
});

describe("language store", () => {
  it("defaults to Persian", () => {
    expect(useLanguageStore.getState().language).toBe("fa");
  });

  it("switches language", () => {
    useLanguageStore.getState().setLanguage("en");
    expect(useLanguageStore.getState().language).toBe("en");
  });
});
