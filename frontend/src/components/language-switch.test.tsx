import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { NotFoundBlock } from "./not-found-block";
import { TierBadge } from "./tier-badge";
import { useLanguageStore } from "@/lib/i18n";

/**
 * The dictionary tests prove the translations exist; these prove the components
 * are actually wired to them. A component that renders a bare Persian literal
 * would pass the dictionary tests and fail here.
 */

beforeEach(() => {
  useLanguageStore.setState({ language: "fa" });
});

const english = () => useLanguageStore.setState({ language: "en" });

describe("components follow the interface language", () => {
  it("renders a tier label in Persian by default", () => {
    render(<TierBadge tier="gold" />);
    expect(screen.getByText("طلایی")).toBeInTheDocument();
  });

  it("renders the same tier label in English", () => {
    english();
    render(<TierBadge tier="gold" />);
    expect(screen.getByText("Gold")).toBeInTheDocument();
    expect(screen.queryByText("طلایی")).not.toBeInTheDocument();
  });

  it("translates a component's default props, not just its arguments", () => {
    english();
    render(<NotFoundBlock />);
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });

  it("translates a Persian string passed in by a caller", () => {
    english();
    render(<NotFoundBlock title="آلبوم یافت نشد" />);
    expect(screen.getByText("Album not found")).toBeInTheDocument();
  });

  it("leaves an untranslated string readable instead of blank", () => {
    english();
    render(<NotFoundBlock title="عنوانی که ترجمه ندارد" />);
    expect(screen.getByText("عنوانی که ترجمه ندارد")).toBeInTheDocument();
  });
});
