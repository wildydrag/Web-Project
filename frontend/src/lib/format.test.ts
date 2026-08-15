import { beforeEach, describe, expect, it } from "vitest";

import {
  formatDate,
  formatDuration,
  formatNumber,
  formatToman,
  formatYear,
  listSeparator,
  toFaDigits,
} from "./format";
import { useLanguageStore } from "@/lib/i18n";

beforeEach(() => {
  useLanguageStore.setState({ language: "fa" });
});

const english = () => useLanguageStore.setState({ language: "en" });

describe("formatting in Persian", () => {
  it("converts Latin digits to Persian", () => {
    expect(toFaDigits("2026")).toBe("۲۰۲۶");
  });

  it("formats a duration as m:ss with Persian digits", () => {
    expect(formatDuration(125)).toBe("۲:۰۵");
    expect(formatDuration(5)).toBe("۰:۰۵");
  });

  it("appends the Toman suffix", () => {
    expect(formatToman(79000)).toContain("تومان");
  });

  it("renders grouped numbers with Persian digits", () => {
    expect(formatNumber(1234)).toMatch(/[۰-۹]/);
  });

  it("uses the Jalali calendar", () => {
    // 2026-08-13 Gregorian falls in 1405 Jalali.
    expect(formatYear("2026-08-13")).toBe("۱۴۰۵");
  });

  it("joins lists with a Persian comma", () => {
    expect(listSeparator()).toBe("، ");
  });
});

describe("formatting in English", () => {
  it("leaves digits in Latin script", () => {
    english();
    expect(toFaDigits("2026")).toBe("2026");
  });

  it("formats a duration with Latin digits", () => {
    english();
    expect(formatDuration(125)).toBe("2:05");
  });

  it("groups numbers the English way", () => {
    english();
    expect(formatNumber(1234)).toBe("1,234");
  });

  it("names the currency in English rather than Persian", () => {
    english();
    const price = formatToman(79000);
    expect(price).toContain("Toman");
    expect(price).not.toContain("تومان");
  });

  it("switches to the Gregorian calendar", () => {
    english();
    expect(formatYear("2026-08-13")).toBe("2026");
  });

  it("writes a full date without Persian month names", () => {
    english();
    const date = formatDate("2026-08-13");
    expect(date).toContain("2026");
    expect(date).not.toMatch(/[؀-ۿ]/);
  });

  it("joins lists with a Latin comma", () => {
    english();
    expect(listSeparator()).toBe(", ");
  });
});

describe("switching language", () => {
  it("re-formats the same value both ways", () => {
    expect(formatNumber(1234)).toMatch(/[۰-۹]/);
    english();
    expect(formatNumber(1234)).toBe("1,234");
    useLanguageStore.setState({ language: "fa" });
    expect(formatNumber(1234)).toMatch(/[۰-۹]/);
  });
});
