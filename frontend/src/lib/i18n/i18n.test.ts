import { beforeEach, describe, expect, it } from "vitest";

import { DIRECTION, LOCALE, tr, translate, useLanguageStore } from "@/lib/i18n";
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

  it("covers the tier, role and genre tables, which are rendered from data", () => {
    for (const label of [
      "پایه (رایگان)", "نقره‌ای", "طلایی",
      "شنونده", "هنرمند", "پشتیبان", "مدیر سامانه",
      "پاپ", "راک", "سنتی", "الکترونیک", "هیپ‌هاپ", "کلاسیک", "جز", "فولک",
      "باز", "پاسخ داده شده", "بسته شده", "در انتظار پرداخت", "تسویه شده",
    ]) {
      expect(EN[label], `missing translation for ${label}`).toBeTruthy();
    }
  });

  it("has no empty translations", () => {
    for (const [fa, en] of Object.entries(EN)) {
      expect(en.trim(), `empty translation for ${fa}`).not.toBe("");
    }
  });

  it("keeps every placeholder that the Persian source declares", () => {
    // A dropped `{n}` would silently swallow a number on screen.
    const slots = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort().join(",");
    for (const [fa, en] of Object.entries(EN)) {
      if (!fa.includes("{")) continue;
      expect(slots(en), `placeholder mismatch for ${fa}`).toBe(slots(fa));
    }
  });
});

describe("interpolation", () => {
  it("substitutes values into the Persian string", () => {
    expect(translate("{n} آهنگ", "fa", { n: "۵" })).toBe("۵ آهنگ");
  });

  it("substitutes values into the English translation", () => {
    expect(translate("{n} آهنگ", "en", { n: 5 })).toBe("5 tracks");
  });

  it("fills several slots at once", () => {
    expect(translate("{n} از {limit} پلی‌لیست", "en", { n: 2, limit: 6 }))
      .toBe("2 of 6 playlists");
  });

  it("leaves an unknown placeholder alone rather than printing undefined", () => {
    expect(translate("{n} آهنگ", "en", {})).toBe("{n} tracks");
  });

  it("works on a string that has no translation yet", () => {
    expect(translate("سلام {name}", "en", { name: "نگار" })).toBe("سلام نگار");
  });
});

describe("tr (used outside React render)", () => {
  it("follows the store's current language", () => {
    expect(tr("خانه")).toBe("خانه");
    useLanguageStore.getState().setLanguage("en");
    expect(tr("خانه")).toBe("Home");
  });

  it("interpolates like the hook does", () => {
    useLanguageStore.getState().setLanguage("en");
    expect(tr("پرداخت {amount}", { amount: "1,000" })).toBe("Pay 1,000");
  });
});

describe("writing direction", () => {
  it("flips the layout with the language", () => {
    expect(DIRECTION.fa).toBe("rtl");
    expect(DIRECTION.en).toBe("ltr");
  });

  it("exposes a BCP-47 tag for Intl formatting", () => {
    expect(LOCALE.fa).toBe("fa-IR");
    expect(LOCALE.en).toBe("en-US");
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
