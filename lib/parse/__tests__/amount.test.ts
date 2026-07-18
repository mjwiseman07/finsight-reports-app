/**
 * Vitest suite for lib/parse/amount.ts.
 * Coverage:
 *   - en-* family (USD/CAD/GBP/AUD/NZD/MXN) with `1,234.56` grouping
 *   - EUR default (de-DE) with `1.234,56`
 *   - fr-FR / fr-CA with space / NBSP grouping
 *   - de-CH apostrophe grouping
 *   - JPY zero-fraction handling
 *   - INR lakh/crore grouping
 *   - Paren-negative + leading-minus + Unicode minus
 *   - Currency prefixes + ISO codes
 *   - Heuristic fallback for mixed locales
 *   - Strict mode returns null on ambiguity
 *   - Backward-compat with existing en-US-only parsers (no options)
 *   - Cent-integer helper
 *   - parseAmountOrZero contract
 */
import { describe, expect, it } from "vitest";
import {
  CURRENCY_TO_DEFAULT_LOCALE,
  parseAmount,
  parseAmountOrZero,
  parseAmountToCents,
} from "../amount";

describe("parseAmount — en-* family (USD/CAD/GBP/AUD/NZD/MXN)", () => {
  const enFamily = ["USD", "CAD", "GBP", "AUD", "NZD", "MXN"];

  for (const currency of enFamily) {
    it(`${currency}: parses "1,234.56"`, () => {
      expect(parseAmount("1,234.56", { currency })).toBe(1234.56);
    });
    it(`${currency}: parses "1,234,567.89"`, () => {
      expect(parseAmount("1,234,567.89", { currency })).toBe(1234567.89);
    });
    it(`${currency}: parses bare "1234.56"`, () => {
      expect(parseAmount("1234.56", { currency })).toBe(1234.56);
    });
    it(`${currency}: parses currency-prefixed "$1,234.56"`, () => {
      expect(parseAmount("$1,234.56", { currency })).toBe(1234.56);
    });
  }
});

describe("parseAmount — EUR (de-DE default)", () => {
  it(`parses "1.234,56"`, () => {
    expect(parseAmount("1.234,56", { currency: "EUR" })).toBe(1234.56);
  });
  it(`parses "1.234.567,89"`, () => {
    expect(parseAmount("1.234.567,89", { currency: "EUR" })).toBe(1234567.89);
  });
  it(`parses "€1.234,56"`, () => {
    expect(parseAmount("€1.234,56", { currency: "EUR" })).toBe(1234.56);
  });
  it(`parses bare "1234,56"`, () => {
    expect(parseAmount("1234,56", { currency: "EUR" })).toBe(1234.56);
  });
});

describe("parseAmount — fr-FR / fr-CA (space + NBSP grouping)", () => {
  it(`fr-FR: parses "1 234,56"`, () => {
    expect(parseAmount("1 234,56", { locale: "fr-FR" })).toBe(1234.56);
  });
  it(`fr-FR: parses NBSP "1\u00a0234,56"`, () => {
    expect(parseAmount("1\u00a0234,56", { locale: "fr-FR" })).toBe(1234.56);
  });
  it(`fr-FR: parses NNBSP "1\u202f234,56"`, () => {
    expect(parseAmount("1\u202f234,56", { locale: "fr-FR" })).toBe(1234.56);
  });
  it(`fr-CA: parses "1 234,56"`, () => {
    expect(parseAmount("1 234,56", { locale: "fr-CA" })).toBe(1234.56);
  });
});

describe("parseAmount — de-CH (apostrophe grouping)", () => {
  it(`parses "1'234.56"`, () => {
    expect(parseAmount("1'234.56", { currency: "CHF" })).toBe(1234.56);
  });
  it(`parses "1'234'567.89"`, () => {
    expect(parseAmount("1'234'567.89", { currency: "CHF" })).toBe(1234567.89);
  });
  it(`parses "CHF 1'234.56"`, () => {
    expect(parseAmount("CHF 1'234.56", { currency: "CHF" })).toBe(1234.56);
  });
});

describe("parseAmount — JPY (zero decimals)", () => {
  it(`parses "1,234"`, () => {
    expect(parseAmount("1,234", { currency: "JPY" })).toBe(1234);
  });
  it(`parses "1,234,567"`, () => {
    expect(parseAmount("1,234,567", { currency: "JPY" })).toBe(1234567);
  });
  it(`parses "¥1,234"`, () => {
    expect(parseAmount("¥1,234", { currency: "JPY" })).toBe(1234);
  });
});

describe("parseAmount — INR (lakh/crore grouping)", () => {
  it(`parses "1,23,456.78"`, () => {
    expect(parseAmount("1,23,456.78", { currency: "INR" })).toBe(123456.78);
  });
  it(`parses "1,00,00,000"`, () => {
    // One crore
    expect(parseAmount("1,00,00,000", { currency: "INR" })).toBe(10000000);
  });
  it(`parses "₹1,23,456.78"`, () => {
    expect(parseAmount("₹1,23,456.78", { currency: "INR" })).toBe(123456.78);
  });
});

describe("parseAmount — negatives", () => {
  it(`paren-negative "(1,234.56)"`, () => {
    expect(parseAmount("(1,234.56)", { currency: "USD" })).toBe(-1234.56);
  });
  it(`leading-minus "-1,234.56"`, () => {
    expect(parseAmount("-1,234.56", { currency: "USD" })).toBe(-1234.56);
  });
  it(`Unicode minus "\u22121,234.56"`, () => {
    expect(parseAmount("\u22121,234.56", { currency: "USD" })).toBe(-1234.56);
  });
  it(`paren-negative EUR "(1.234,56)"`, () => {
    expect(parseAmount("(1.234,56)", { currency: "EUR" })).toBe(-1234.56);
  });
});

describe("parseAmount — currency-symbol / ISO stripping", () => {
  it(`strips "USD 1,234.56"`, () => {
    expect(parseAmount("USD 1,234.56", { currency: "USD" })).toBe(1234.56);
  });
  it(`strips "CA$1,234.56"`, () => {
    expect(parseAmount("CA$1,234.56", { currency: "CAD" })).toBe(1234.56);
  });
  it(`strips "£1,234.56"`, () => {
    expect(parseAmount("£1,234.56", { currency: "GBP" })).toBe(1234.56);
  });
  it(`strips "A$1,234.56"`, () => {
    expect(parseAmount("A$1,234.56", { currency: "AUD" })).toBe(1234.56);
  });
});

describe("parseAmount — heuristic fallback (Strategy B)", () => {
  it(`en-US-formatted input to an EUR tenant still parses`, () => {
    // "1,234.56" in a tenant whose home is EUR (de-DE default). The
    // de-DE interpreter would reject the trailing ".56" (decimal is ",")
    // and the heuristic must fall back to en-US interpretation.
    expect(parseAmount("1,234.56", { currency: "EUR" })).toBe(1234.56);
  });
  it(`de-DE-formatted input to a USD tenant still parses`, () => {
    // "1.234,56" in a USD tenant. en-US interpreter rejects; heuristic
    // sees `.` before `,` and infers `,` as decimal.
    expect(parseAmount("1.234,56", { currency: "USD" })).toBe(1234.56);
  });
  it(`bare "1234" always parses`, () => {
    expect(parseAmount("1234", { currency: "USD" })).toBe(1234);
    expect(parseAmount("1234", { currency: "EUR" })).toBe(1234);
    expect(parseAmount("1234", { currency: "JPY" })).toBe(1234);
  });
  it(`ambiguous "1,234" defaults to en-US thousands (heuristic prefers this)`, () => {
    // In strict-EUR mode the interpreter should classify "," as decimal,
    // yielding 1.234. Verify strict path below.
    expect(parseAmount("1,234", { currency: "USD" })).toBe(1234);
  });
  // MC-2e.4: Option B (no currency hint) must cover these — en-US used to
  // false-accept comma-decimals as grouping, and reject Swiss apostrophes.
  it(`bare comma-decimal without currency hint (was 100× off / wrong)`, () => {
    expect(parseAmount("1234,56")).toBe(1234.56);
    expect(parseAmount("0,5")).toBe(0.5);
    expect(parseAmount("12,34")).toBe(12.34);
  });
  it(`Swiss apostrophe without CHF hint (was null)`, () => {
    expect(parseAmount("1'234.56")).toBe(1234.56);
    expect(parseAmount("1'234'567.89")).toBe(1234567.89);
  });
});

describe("parseAmount — strict mode", () => {
  it(`strict rejects mismatched locale`, () => {
    // "1.234,56" cannot be parsed in strict en-US mode.
    expect(parseAmount("1.234,56", { currency: "USD", strict: true })).toBe(null);
  });
  it(`strict rejects garbage`, () => {
    expect(parseAmount("abc", { strict: true })).toBe(null);
  });
  it(`strict accepts a well-formed match`, () => {
    expect(parseAmount("1,234.56", { currency: "USD", strict: true })).toBe(1234.56);
  });
});

describe("parseAmount — invalid input", () => {
  it(`null → null`, () => expect(parseAmount(null)).toBe(null));
  it(`undefined → null`, () => expect(parseAmount(undefined)).toBe(null));
  it(`empty string → null`, () => expect(parseAmount("")).toBe(null));
  it(`whitespace → null`, () => expect(parseAmount("   ")).toBe(null));
  it(`"N/A" → null`, () => expect(parseAmount("N/A")).toBe(null));
  it(`"—" → null`, () => expect(parseAmount("—")).toBe(null));
  it(`"abc" → null`, () => expect(parseAmount("abc")).toBe(null));
  it(`number NaN → null`, () => expect(parseAmount(NaN)).toBe(null));
  it(`number Infinity → null`, () => expect(parseAmount(Infinity)).toBe(null));
  it(`raw number is passed through`, () => expect(parseAmount(1234.56)).toBe(1234.56));
});

describe("parseAmount — backward compatibility (no options)", () => {
  // These cases mirror what the legacy en-US-only parsers accepted. New
  // module with no options must return the same values.
  it(`"$1,234.56" → 1234.56`, () => expect(parseAmount("$1,234.56")).toBe(1234.56));
  it(`"1,234.56" → 1234.56`, () => expect(parseAmount("1,234.56")).toBe(1234.56));
  it(`"(1,234.56)" → -1234.56`, () => expect(parseAmount("(1,234.56)")).toBe(-1234.56));
  it(`"-1,234.56" → -1234.56`, () => expect(parseAmount("-1,234.56")).toBe(-1234.56));
  it(`"1234.56" → 1234.56`, () => expect(parseAmount("1234.56")).toBe(1234.56));
  it(`legacy paren + $ + trailing space`, () =>
    expect(parseAmount("($1,234.56)  ")).toBe(-1234.56));
});

describe("parseAmountOrZero", () => {
  it(`valid → number`, () => expect(parseAmountOrZero("1,234.56")).toBe(1234.56));
  it(`null → 0`, () => expect(parseAmountOrZero(null)).toBe(0));
  it(`undefined → 0`, () => expect(parseAmountOrZero(undefined)).toBe(0));
  it(`empty → 0`, () => expect(parseAmountOrZero("")).toBe(0));
  it(`"abc" → 0`, () => expect(parseAmountOrZero("abc")).toBe(0));
});

describe("parseAmountToCents", () => {
  it(`"1,234.56" → 123456`, () => expect(parseAmountToCents("1,234.56")).toBe(123456));
  it(`"1.234,56" EUR → 123456`, () =>
    expect(parseAmountToCents("1.234,56", { currency: "EUR" })).toBe(123456));
  it(`"0.01" → 1`, () => expect(parseAmountToCents("0.01")).toBe(1));
  it(`"0.001" rounds to 0`, () => expect(parseAmountToCents("0.001")).toBe(0));
  it(`"0.005" rounds to 1 (half-up)`, () => expect(parseAmountToCents("0.005")).toBe(1));
  it(`"(1,234.56)" → -123456`, () => expect(parseAmountToCents("(1,234.56)")).toBe(-123456));
  it(`null → null`, () => expect(parseAmountToCents(null)).toBe(null));
  it(`"abc" → null`, () => expect(parseAmountToCents("abc")).toBe(null));
});

describe("CURRENCY_TO_DEFAULT_LOCALE", () => {
  it(`covers the approved 10 currencies`, () => {
    expect(CURRENCY_TO_DEFAULT_LOCALE.USD).toBe("en-US");
    expect(CURRENCY_TO_DEFAULT_LOCALE.CAD).toBe("en-CA");
    expect(CURRENCY_TO_DEFAULT_LOCALE.GBP).toBe("en-GB");
    expect(CURRENCY_TO_DEFAULT_LOCALE.AUD).toBe("en-AU");
    expect(CURRENCY_TO_DEFAULT_LOCALE.NZD).toBe("en-NZ");
    expect(CURRENCY_TO_DEFAULT_LOCALE.MXN).toBe("es-MX");
    expect(CURRENCY_TO_DEFAULT_LOCALE.EUR).toBe("de-DE");
    expect(CURRENCY_TO_DEFAULT_LOCALE.CHF).toBe("de-CH");
    expect(CURRENCY_TO_DEFAULT_LOCALE.JPY).toBe("ja-JP");
    expect(CURRENCY_TO_DEFAULT_LOCALE.INR).toBe("en-IN");
  });
  it(`unknown currency falls back to en-US path (no throw)`, () => {
    expect(parseAmount("1,234.56", { currency: "ZZZ" as string })).toBe(1234.56);
  });
});

describe("parseAmount — case-insensitive currency", () => {
  it(`accepts lowercase currency codes`, () => {
    expect(parseAmount("1.234,56", { currency: "eur" })).toBe(1234.56);
  });
  it(`accepts mixed-case currency codes`, () => {
    expect(parseAmount("1.234,56", { currency: "Eur" })).toBe(1234.56);
  });
});
