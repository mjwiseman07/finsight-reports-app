import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_FALLBACK_CURRENCY,
  PLACEHOLDER,
  formatMoney,
  formatMoneyCompact,
  getCurrencySymbol,
  isValidCurrencyCode,
} from "../money";

describe("isValidCurrencyCode", () => {
  it("accepts standard ISO 4217 codes", () => {
    expect(isValidCurrencyCode("USD")).toBe(true);
    expect(isValidCurrencyCode("CAD")).toBe(true);
    expect(isValidCurrencyCode("EUR")).toBe(true);
    expect(isValidCurrencyCode("GBP")).toBe(true);
    expect(isValidCurrencyCode("JPY")).toBe(true);
  });

  it("rejects malformed codes", () => {
    expect(isValidCurrencyCode("us")).toBe(false); // wrong length + case
    expect(isValidCurrencyCode("USDX")).toBe(false); // too long
    expect(isValidCurrencyCode("US1")).toBe(false); // digit
    expect(isValidCurrencyCode("")).toBe(false);
    // Runtime may still accept some 3-letter uppercase strings even when they
    // aren't real ISO codes; the strict regex + NF construction combo is our
    // best-effort gate. We assert only the definitely-invalid cases.
  });

  it("rejects non-strings without throwing", () => {
    // @ts-expect-error — deliberately invalid input
    expect(isValidCurrencyCode(null)).toBe(false);
    // @ts-expect-error — deliberately invalid input
    expect(isValidCurrencyCode(undefined)).toBe(false);
    // @ts-expect-error — deliberately invalid input
    expect(isValidCurrencyCode(123)).toBe(false);
  });
});

describe("formatMoney — happy path", () => {
  it("formats USD in en-US", () => {
    expect(formatMoney(1234.56, "USD", { locale: "en-US" })).toBe("$1,234.56");
  });

  it("formats CAD in en-CA", () => {
    // en-CA usually renders CAD with a plain "$".
    const result = formatMoney(1234.56, "CAD", { locale: "en-CA" });
    expect(result).toMatch(/1,?234[.,]56/);
    expect(result).toContain("$");
  });

  it("formats EUR in de-DE", () => {
    const result = formatMoney(1234.56, "EUR", { locale: "de-DE" });
    // de-DE uses "." for thousands, "," for decimal; "€" trails.
    expect(result).toContain("€");
    expect(result).toContain("1.234");
    expect(result).toContain("56");
  });

  it("formats GBP in en-GB", () => {
    const result = formatMoney(1234.56, "GBP", { locale: "en-GB" });
    expect(result).toContain("£");
    expect(result).toContain("1,234");
  });

  it("respects minimum/maximum fraction digits", () => {
    expect(
      formatMoney(1234, "USD", {
        locale: "en-US",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    ).toBe("$1,234");
  });

  it("respects signDisplay", () => {
    const result = formatMoney(42, "USD", {
      locale: "en-US",
      signDisplay: "always",
    });
    expect(result).toContain("+");
    expect(result).toContain("42");
  });
});

describe("formatMoney — negative values", () => {
  it("renders negative USD in en-US", () => {
    const result = formatMoney(-1234.56, "USD", { locale: "en-US" });
    // en-US default is "-$1,234.56"; we just assert digits + sign token.
    expect(result).toMatch(/1,?234[.,]56/);
    expect(result.includes("-") || result.includes("(")).toBe(true);
  });

  it("renders negative EUR in de-DE", () => {
    const result = formatMoney(-1234.56, "EUR", { locale: "de-DE" });
    expect(result).toContain("€");
    expect(result.includes("-") || result.includes("(")).toBe(true);
  });
});

describe("formatMoney — defensive inputs", () => {
  it("returns placeholder for NaN", () => {
    expect(formatMoney(NaN, "USD")).toBe(PLACEHOLDER);
  });

  it("returns placeholder for Infinity", () => {
    expect(formatMoney(Infinity, "USD")).toBe(PLACEHOLDER);
    expect(formatMoney(-Infinity, "USD")).toBe(PLACEHOLDER);
  });

  it("returns placeholder for null/undefined amount", () => {
    expect(formatMoney(null, "USD")).toBe(PLACEHOLDER);
    expect(formatMoney(undefined, "USD")).toBe(PLACEHOLDER);
  });

  it("returns placeholder when amount is not a number", () => {
    // @ts-expect-error — deliberately invalid input
    expect(formatMoney("1234", "USD")).toBe(PLACEHOLDER);
  });
});

describe("formatMoney — unknown currency fallback", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("falls back to USD without throwing for unknown code", () => {
    const result = formatMoney(1234, "XYZ", { locale: "en-US" });
    expect(result).toContain("1,234");
    expect(result).toContain("$");
  });

  it("falls back for null/undefined currency", () => {
    expect(() => formatMoney(1234, null, { locale: "en-US" })).not.toThrow();
    expect(() => formatMoney(1234, undefined, { locale: "en-US" })).not.toThrow();
  });

  it("logs a dev warn on fallback (NODE_ENV !== production)", () => {
    // vitest defaults NODE_ENV to "test", so the warn path fires.
    formatMoney(1234, "XYZ", { locale: "en-US" });
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("formatMoneyCompact", () => {
  it("collapses millions to M", () => {
    const result = formatMoneyCompact(1_234_567, "USD", { locale: "en-US" });
    expect(result).toContain("$");
    expect(result).toMatch(/M/i);
  });

  it("collapses thousands to K", () => {
    const result = formatMoneyCompact(2_500, "USD", { locale: "en-US" });
    expect(result).toContain("$");
    expect(result).toMatch(/K/i);
  });

  it("still returns placeholder for NaN", () => {
    expect(formatMoneyCompact(NaN, "USD")).toBe(PLACEHOLDER);
  });
});

describe("getCurrencySymbol", () => {
  it("returns $ for USD in en-US", () => {
    expect(getCurrencySymbol("USD", "en-US")).toBe("$");
  });

  it("returns € for EUR", () => {
    expect(getCurrencySymbol("EUR", "en-US")).toBe("€");
  });

  it("returns £ for GBP", () => {
    expect(getCurrencySymbol("GBP", "en-US")).toBe("£");
  });

  it("returns something containing CAD when localized to en-US", () => {
    // en-US typically renders CAD as "CA$"; some ICU builds return "CAD".
    const symbol = getCurrencySymbol("CAD", "en-US");
    expect(symbol.length).toBeGreaterThan(0);
    expect(symbol.includes("$") || symbol.includes("CAD")).toBe(true);
  });

  it("falls back gracefully for unknown code", () => {
    // resolveCurrency swaps unknown→USD, so we get the USD symbol back.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const symbol = getCurrencySymbol("XYZ", "en-US");
    expect(symbol).toBe("$");
    warnSpy.mockRestore();
  });
});

describe("constants", () => {
  it("exports the expected placeholder and fallback", () => {
    expect(PLACEHOLDER).toBe("—");
    expect(DEFAULT_FALLBACK_CURRENCY).toBe("USD");
  });
});
