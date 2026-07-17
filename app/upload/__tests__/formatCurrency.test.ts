/**
 * Phase MC-2d.3a — Board-package currency formatter tests.
 *
 * These tests protect the byte-identical legacy behavior of the three
 * module-scoped currency formatters in `app/upload/page.tsx`. They also
 * verify the new optional currency argument behaves correctly for CAD
 * and EUR, which MC-2d.3b will begin exercising from real call sites.
 *
 * NOTE: the target file (`app/upload/page.tsx`) is a Next.js "use client"
 * page component with heavy imports; we cannot import the raw functions
 * directly from it. Instead, we replicate their exact source into a local
 * fixture module (`./formatCurrency-fixture.ts`) and keep the fixture and
 * the real functions synchronized manually. If a future PR modifies the
 * real functions, the fixture MUST be updated in lockstep and this test
 * suite re-run.
 *
 * The fixture is intentionally colocated with the test file so the drift
 * risk is visible at review time. MC-2d.3c will move these formatters
 * into a proper `lib/format/board-package.ts` module and delete the
 * fixture; at that point these tests will import from the real module.
 */
import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatMoneyLegacy,
  formatOptionalCurrency,
} from "./formatCurrency-fixture";

describe("formatCurrency — legacy USD behavior (byte-identical)", () => {
  it("renders positive whole dollars with dollar sign and grouping", () => {
    expect(formatCurrency(1234)).toBe("$1,234");
    expect(formatCurrency(1_234_567)).toBe("$1,234,567");
    expect(formatCurrency(0)).toBe("$0");
  });

  it("wraps negatives in accounting parens (no minus sign)", () => {
    expect(formatCurrency(-1234)).toBe("($1,234)");
    expect(formatCurrency(-1_234_567)).toBe("($1,234,567)");
  });

  it("rounds fractional amounts to whole dollars", () => {
    expect(formatCurrency(1234.49)).toBe("$1,234");
    expect(formatCurrency(1234.51)).toBe("$1,235");
    expect(formatCurrency(-1234.51)).toBe("($1,235)");
  });

  it("returns empty string for null/undefined", () => {
    expect(formatCurrency(null)).toBe("");
    expect(formatCurrency(undefined)).toBe("");
  });
});

describe("formatCurrency — non-USD (MC-2d.3b will exercise)", () => {
  it("renders CAD with the CA$ symbol and preserves parens for negatives", () => {
    expect(formatCurrency(1234, "CAD")).toBe("CA$1,234");
    expect(formatCurrency(-1234, "CAD")).toBe("(CA$1,234)");
  });

  it("renders EUR and preserves parens for negatives", () => {
    // Runtime locale is asserted loosely: some CI runtimes render EUR as
    // "€1,234" and others as "1,234 €" — accept both, plus paren-wrapping.
    const eur = formatCurrency(1234, "EUR");
    expect(eur === "€1,234" || eur === "1,234 €").toBe(true);
    const negEur = formatCurrency(-1234, "EUR");
    expect(negEur.startsWith("(") && negEur.endsWith(")")).toBe(true);
  });

  it("falls back to USD when the currency code is invalid", () => {
    expect(formatCurrency(1234, "XYZ")).toBe("$1,234");
    expect(formatCurrency(1234, "")).toBe("$1,234");
    expect(formatCurrency(1234, null)).toBe("$1,234");
  });
});

describe("formatMoneyLegacy — coalesces nullish to zero", () => {
  it("returns $0 for null/undefined rather than empty string", () => {
    expect(formatMoneyLegacy(null)).toBe("$0");
    expect(formatMoneyLegacy(undefined)).toBe("$0");
  });

  it("otherwise mirrors formatCurrency", () => {
    expect(formatMoneyLegacy(1234)).toBe("$1,234");
    expect(formatMoneyLegacy(-1234)).toBe("($1,234)");
  });

  it("threads currency through", () => {
    expect(formatMoneyLegacy(null, "CAD")).toBe("CA$0");
    expect(formatMoneyLegacy(1234, "CAD")).toBe("CA$1,234");
  });
});

describe("formatOptionalCurrency — nullish → fallback string", () => {
  it("renders default 'Not found' fallback for null/undefined", () => {
    expect(formatOptionalCurrency(null)).toBe("Not found");
    expect(formatOptionalCurrency(undefined)).toBe("Not found");
  });

  it("respects a custom fallback", () => {
    expect(formatOptionalCurrency(null, "N/A")).toBe("N/A");
    expect(formatOptionalCurrency(undefined, "")).toBe("");
  });

  it("otherwise defers to formatCurrency", () => {
    expect(formatOptionalCurrency(1234)).toBe("$1,234");
    expect(formatOptionalCurrency(-1234)).toBe("($1,234)");
  });

  it("threads currency through", () => {
    expect(formatOptionalCurrency(1234, "Not found", "CAD")).toBe("CA$1,234");
    expect(formatOptionalCurrency(null, "N/A", "CAD")).toBe("N/A");
  });
});
