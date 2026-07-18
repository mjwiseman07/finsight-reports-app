/**
 * Phase MC-2e.4 — parseNumber locale-parity + backward-compat suite.
 *
 * Exercises the parseNumber function shipped in MC-2e.3 (app/upload/page.tsx)
 * across 6 locales via the fixture mirror. This is the vitest proof half of
 * MC-2e.4; the live browser smoke via docs/mc-2e-4/de-DE-fixture.xlsx is the
 * end-to-end proof half (see docs/mc-2e-4/SMOKE_REPORT.md).
 *
 * Coverage matrix:
 *   - en-US baseline (backward-compat)
 *   - de-DE / es-ES / nl-NL / it-IT (comma decimal, period grouping)
 *   - de-CH (apostrophe grouping)
 *   - fr-FR / fr-CA (space grouping via NBSP / NNBSP / ASCII)
 *   - en-IN (lakh/crore grouping)
 *   - Paren-negative, leading-minus, spreadsheet formula marker
 *   - Pathological inputs (null/undefined/empty/junk/N/A)
 */
import { describe, expect, it } from "vitest";
import { parseNumber } from "./parseNumber-fixture";

describe("parseNumber — en-US baseline (backward-compat with pre-MC-2e.3)", () => {
  it("returns null for null / undefined / empty string", () => {
    expect(parseNumber(null)).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
    expect(parseNumber("")).toBeNull();
  });

  it("returns null for junk", () => {
    expect(parseNumber("abc")).toBeNull();
    expect(parseNumber("N/A")).toBeNull();
    expect(parseNumber("--")).toBeNull();
  });

  it("passes numbers through", () => {
    expect(parseNumber(1234.56)).toBe(1234.56);
    expect(parseNumber(0)).toBe(0);
    expect(parseNumber(-500)).toBe(-500);
  });

  it("rejects non-finite numbers", () => {
    expect(parseNumber(NaN)).toBeNull();
    expect(parseNumber(Infinity)).toBeNull();
    expect(parseNumber(-Infinity)).toBeNull();
  });

  it("parses en-US grouped values", () => {
    expect(parseNumber("1,234.56")).toBe(1234.56);
    expect(parseNumber("1,234,567.89")).toBe(1234567.89);
    expect(parseNumber("1234")).toBe(1234);
    expect(parseNumber("0.5")).toBe(0.5);
  });

  it("strips en-US currency symbol", () => {
    expect(parseNumber("$1,234.56")).toBe(1234.56);
    expect(parseNumber("$0")).toBe(0);
  });

  it("interprets paren-negatives", () => {
    expect(parseNumber("(1,234.56)")).toBe(-1234.56);
    expect(parseNumber("($500)")).toBe(-500);
  });

  it("interprets leading-minus", () => {
    expect(parseNumber("-1,234.56")).toBe(-1234.56);
    expect(parseNumber("-$500")).toBe(-500);
  });

  it("strips leading = (spreadsheet formula marker)", () => {
    expect(parseNumber("=$1,234.56")).toBe(1234.56);
    expect(parseNumber("=1234")).toBe(1234);
  });
});

describe("parseNumber — de-DE / es-ES / nl-NL / it-IT (comma-decimal, period-grouping)", () => {
  it("parses de-DE amounts correctly (was 100× off pre-MC-2e.3)", () => {
    expect(parseNumber("1.234,56")).toBe(1234.56);
    expect(parseNumber("1.234.567,89")).toBe(1234567.89);
  });

  it("handles small values with only decimal", () => {
    expect(parseNumber("0,5")).toBe(0.5);
    expect(parseNumber("12,34")).toBe(12.34);
  });

  it("handles paren-negatives with de-DE grouping", () => {
    expect(parseNumber("(1.234,56)")).toBe(-1234.56);
  });
});

describe("parseNumber — de-CH (apostrophe grouping)", () => {
  it("parses Swiss amounts correctly (was null pre-MC-2e.3)", () => {
    expect(parseNumber("1'234.56")).toBe(1234.56);
    expect(parseNumber("1'234'567.89")).toBe(1234567.89);
  });
});

describe("parseNumber — fr-FR / fr-CA (space grouping)", () => {
  it("parses ASCII-space grouped amounts (was 100× off pre-MC-2e.3)", () => {
    expect(parseNumber("1 234,56")).toBe(1234.56);
    expect(parseNumber("1 234 567,89")).toBe(1234567.89);
  });

  it("parses NBSP (U+00A0) grouped amounts", () => {
    expect(parseNumber("1\u00a0234,56")).toBe(1234.56);
  });

  it("parses NNBSP (U+202F) grouped amounts (modern French locale)", () => {
    expect(parseNumber("1\u202f234,56")).toBe(1234.56);
  });

  it("parses thin-space (U+2009) grouped amounts", () => {
    expect(parseNumber("1\u2009234,56")).toBe(1234.56);
  });
});

describe("parseNumber — en-IN (lakh/crore grouping)", () => {
  it("parses Indian numbering correctly (was 100× off pre-MC-2e.3)", () => {
    // 1,23,456.78 → one lakh twenty-three thousand four hundred fifty-six point seventy-eight
    expect(parseNumber("1,23,456.78")).toBe(123456.78);
    // 1,00,00,000 → one crore
    expect(parseNumber("1,00,00,000")).toBe(10000000);
  });
});

describe("parseNumber — mixed edge cases", () => {
  it("handles surrounding whitespace", () => {
    expect(parseNumber("  1,234.56  ")).toBe(1234.56);
    expect(parseNumber("\t1.234,56\t")).toBe(1234.56);
  });

  it("handles zero", () => {
    expect(parseNumber("0")).toBe(0);
    expect(parseNumber("0,00")).toBe(0);
    expect(parseNumber("0.00")).toBe(0);
  });

  it("still returns null for values with no digits", () => {
    expect(parseNumber(".")).toBeNull();
    expect(parseNumber(",")).toBeNull();
    expect(parseNumber("$")).toBeNull();
  });
});
