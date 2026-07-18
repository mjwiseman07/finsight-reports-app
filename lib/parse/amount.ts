/**
 * lib/parse/amount.ts
 *
 * Shared locale-aware money-string parser — introduced by Phase MC-2e of
 * Issue #6 (Intuit App Store multicurrency compliance).
 *
 * Context
 * -------
 * Prior to this file, the app had 8 distinct parseAmount / parseNumber /
 * parseAmountToCents / parseCurrencyLabel implementations sprinkled across
 * upload page, integration providers, normalizers, manufacturing rule
 * helpers, PDF label parsing, and AP intake. Every one of them stripped `,`
 * as a thousands separator, silently corrupting any non-en-* upload (e.g.
 * de-DE `1.234,56`, fr-FR `1 234,56`, de-CH `1'234.56`).
 *
 * The Issue #6 gap analysis identified this as Gap I-3. The formatting side
 * was closed by MC-2a..MC-2d (see lib/format/money.ts and 452/464 currency-
 * aware sites in app/upload/page.tsx). This module closes the parse side.
 *
 * Design
 * ------
 * Hybrid strategy A + B:
 *   A. Home-currency-driven default parse locale (predictable, no UI).
 *   B. Per-cell heuristic fallback (lenient) when the home locale's expected
 *      pattern doesn't match the given cell (e.g. a US-formatted invoice
 *      pasted into an EU tenant's spreadsheet).
 *
 * Rule for consumers
 * ------------------
 * NEVER hand-roll a parser. Always:
 *   1) Import { parseAmount } from "@/lib/parse/amount";
 *   2) Pass the tenant currency (bundle.sourceMetadata.home_currency, per-row
 *      currency for AP/AR, or DEFAULT_FALLBACK_CURRENCY).
 *   3) Preserve the caller's null-vs-0 contract at the call site with
 *      `?? 0` or `|| 0` as needed (or use parseAmountOrZero / parseAmountToCents
 *      helpers exported below).
 */

import { DEFAULT_FALLBACK_CURRENCY } from "@/lib/format/money";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ParseAmountOptions {
  /**
   * ISO 4217 currency code (e.g. "USD", "EUR", "CAD"). Used to derive the
   * default parse locale via CURRENCY_TO_DEFAULT_LOCALE. Case-insensitive.
   */
  currency?: string;
  /**
   * Explicit BCP-47 locale (e.g. "de-DE", "fr-FR"). Overrides the
   * currency-derived default. Case-sensitive per BCP-47 conventions
   * ("en-US", not "EN-US").
   */
  locale?: string;
  /**
   * When true, ambiguous or unrecognized inputs return null instead of
   * falling back to the lenient heuristic. Default false. Used by
   * tests and ops tooling; not intended for the default upload path.
   */
  strict?: boolean;
}

// ---------------------------------------------------------------------------
// Currency → default parse locale
// ---------------------------------------------------------------------------

/**
 * Maps ISO 4217 currency codes to the BCP-47 locale we use as the default
 * grouping/decimal convention. Values chosen for MC-2e.1 (approved by user):
 *
 *   USD/CAD/GBP/AUD/NZD/MXN → en-* family, `1,234.56` grouping.
 *   EUR                     → de-DE `1.234,56` (largest EU economy;
 *                              per-cell heuristic covers fr-FR/es-ES/nl-NL).
 *   CHF                     → de-CH `1'234.56` (Swiss apostrophe).
 *   JPY                     → ja-JP `1,234` (zero decimals is a parse hint).
 *   INR                     → en-IN `1,23,456.78` (lakh/crore grouping).
 *
 * Follow-up (deferred, not scoped for MC-2e.1):
 *   SEK/NOK/DKK/ISK → sv-SE `1 234,56` (Nordic space grouping).
 */
export const CURRENCY_TO_DEFAULT_LOCALE: Record<string, string> = {
  USD: "en-US",
  CAD: "en-CA",
  GBP: "en-GB",
  AUD: "en-AU",
  NZD: "en-NZ",
  MXN: "es-MX",
  EUR: "de-DE",
  CHF: "de-CH",
  JPY: "ja-JP",
  INR: "en-IN",
};

// ---------------------------------------------------------------------------
// Locale → grouping/decimal separators
// ---------------------------------------------------------------------------

interface LocalePunctuation {
  /** The character(s) used as thousands/grouping separator(s). */
  groupingSeparators: readonly string[];
  /** The character used as the decimal separator. */
  decimalSeparator: string;
  /** Fraction digits, when known (e.g. JPY = 0). undefined for locales that vary. */
  defaultFractionDigits?: number;
  /**
   * Non-standard grouping widths (e.g. en-IN groups as "1,23,456"). When
   * omitted, standard three-digit grouping is assumed.
   */
  grouping?: readonly number[];
}

// Order of grouping-separator arrays matters: the first entry is the
// "canonical" separator for that locale. Alternates (e.g. NBSP for fr-FR)
// are also accepted during parsing.
const LOCALE_PUNCTUATION: Record<string, LocalePunctuation> = {
  "en-US": { groupingSeparators: [","], decimalSeparator: "." },
  "en-CA": { groupingSeparators: [","], decimalSeparator: "." },
  "en-GB": { groupingSeparators: [","], decimalSeparator: "." },
  "en-AU": { groupingSeparators: [","], decimalSeparator: "." },
  "en-NZ": { groupingSeparators: [","], decimalSeparator: "." },
  "en-IN": { groupingSeparators: [","], decimalSeparator: ".", grouping: [3, 2] },
  "es-MX": { groupingSeparators: [","], decimalSeparator: "." },
  "de-DE": { groupingSeparators: [".", "\u00a0"], decimalSeparator: "," },
  "fr-FR": { groupingSeparators: ["\u202f", "\u00a0", " "], decimalSeparator: "," },
  "fr-CA": { groupingSeparators: ["\u00a0", " "], decimalSeparator: "," },
  "es-ES": { groupingSeparators: [".", "\u00a0"], decimalSeparator: "," },
  "nl-NL": { groupingSeparators: ["."], decimalSeparator: "," },
  "it-IT": { groupingSeparators: ["."], decimalSeparator: "," },
  "de-CH": { groupingSeparators: ["'", "\u2019"], decimalSeparator: "." },
  "ja-JP": { groupingSeparators: [","], decimalSeparator: ".", defaultFractionDigits: 0 },
};

/**
 * Resolves the LocalePunctuation for a given options object. Precedence:
 *   1) options.locale (explicit) → direct lookup.
 *   2) options.currency → CURRENCY_TO_DEFAULT_LOCALE → punctuation lookup.
 *   3) DEFAULT_FALLBACK_CURRENCY → en-US.
 * Returns en-US punctuation if nothing matches.
 */
function resolveLocalePunctuation(options: ParseAmountOptions | undefined): {
  locale: string;
  punctuation: LocalePunctuation;
} {
  const localeOverride = options?.locale;
  if (localeOverride && LOCALE_PUNCTUATION[localeOverride]) {
    return { locale: localeOverride, punctuation: LOCALE_PUNCTUATION[localeOverride] };
  }

  const currency = (options?.currency || DEFAULT_FALLBACK_CURRENCY).toUpperCase();
  const locale = CURRENCY_TO_DEFAULT_LOCALE[currency] || "en-US";
  const punctuation = LOCALE_PUNCTUATION[locale] || LOCALE_PUNCTUATION["en-US"];
  return { locale, punctuation };
}

// ---------------------------------------------------------------------------
// Currency-symbol / whitespace / paren pre-processing
// ---------------------------------------------------------------------------

// Characters we strip before running numeric interpretation. Includes common
// currency symbols, ASCII/Unicode dashes, and ISO 4217 alpha codes.
const CURRENCY_SYMBOL_REGEX =
  /[$€£¥₹₽₩₺₪₫฿]|CHF|USD|CAD|EUR|GBP|AUD|NZD|MXN|JPY|INR|CA\$|A\$|NZ\$|Mex\$/gi;

/** Returns true when the string looks parenthesized-negative: "(1,234.56)". */
function isParenNegative(raw: string): boolean {
  return /^\(.*\)$/.test(raw);
}

/** Returns true when the string starts with a minus sign. */
function isLeadingNegative(raw: string): boolean {
  return /^[-\u2212]/.test(raw);
}

/**
 * Strips currency symbols, ISO codes, whitespace not used for grouping, and
 * paren/negative sign markers. Returns the cleaned numeric text plus a
 * negation flag. The numeric text still contains grouping + decimal
 * separators for the resolver below to interpret.
 */
function stripPresentational(raw: string): { text: string; negative: boolean } {
  let text = raw.trim();
  const paren = isParenNegative(text);
  if (paren) text = text.slice(1, -1).trim();

  const dash = isLeadingNegative(text);
  if (dash) text = text.replace(/^[-\u2212]/, "").trim();

  text = text.replace(CURRENCY_SYMBOL_REGEX, "").trim();

  // Strip trailing "+"/"-" (accounting-style credit/debit indicator).
  text = text.replace(/[+\-]$/, () => {
    return "";
  });

  return { text, negative: paren || dash };
}

// ---------------------------------------------------------------------------
// Core numeric interpretation
// ---------------------------------------------------------------------------

/**
 * Given cleaned numeric text and a locale punctuation profile, try to
 * interpret it into a Number. Returns null if the interpretation fails.
 *
 * Algorithm:
 *   1) Locate the single decimal-separator occurrence (if any).
 *   2) Strip locale grouping separators from the integer side.
 *   3) Require the remaining integer / fraction characters to be digits.
 *   4) Assemble an IEEE Number with ASCII `.` as the decimal.
 *
 * On any mismatch (unknown char, multiple decimals, non-digit residue),
 * return null so the caller can fall back to the lenient heuristic.
 */
function interpretWithLocale(text: string, punctuation: LocalePunctuation): number | null {
  if (!/\d/.test(text)) return null;

  const groupSet = new Set(punctuation.groupingSeparators);
  const decimal = punctuation.decimalSeparator;
  const chars = Array.from(text);

  let decimalIdx = -1;
  for (let i = 0; i < chars.length; i++) {
    if (chars[i] === decimal) {
      if (decimalIdx !== -1) return null; // multiple decimals
      decimalIdx = i;
    }
  }

  const intRaw = decimalIdx === -1 ? text : chars.slice(0, decimalIdx).join("");
  const fracRaw = decimalIdx === -1 ? "" : chars.slice(decimalIdx + 1).join("");

  if (fracRaw && !/^\d+$/.test(fracRaw)) return null;

  let integerDigits = "";
  for (const c of Array.from(intRaw)) {
    if (/\d/.test(c)) {
      integerDigits += c;
    } else if (groupSet.has(c)) {
      continue;
    } else {
      return null;
    }
  }

  if (!integerDigits) {
    if (!fracRaw) return null;
    integerDigits = "0";
  }

  // en-IN and other non-standard grouping widths: skip strict width checks
  // for MC-2e.1 (paste design). Digits-after-strip is sufficient.
  void punctuation.grouping;

  const assembled = fracRaw ? `${integerDigits}.${fracRaw}` : integerDigits;
  const n = Number(assembled);
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Heuristic fallback (Strategy B)
// ---------------------------------------------------------------------------

/**
 * When the home-locale interpreter returns null, apply a lenient heuristic:
 *   - If the string contains exactly one candidate separator character
 *     followed by 1–2 digits (or, for JPY, 0 digits), treat it as decimal.
 *   - If followed by exactly 3 digits, treat it as grouping.
 *   - If multiple separators of the same type are present, they must be
 *     grouping — the last one before the end is the decimal only if the
 *     tail has ≤ 2 digits.
 *   - When still ambiguous (e.g. "1,234" alone), prefer the en-US
 *     interpretation: `,` is thousands, so `1,234` → 1234.
 *
 * Returns null if the string still cannot be resolved.
 */
function interpretHeuristic(text: string): number | null {
  if (!/\d/.test(text)) return null;

  // Consider only ASCII `.` and `,` as ambiguous separators here — Unicode
  // separators (NBSP, thin space, apostrophe) are locale-specific and would
  // have been consumed by the locale-specific interpreter already.
  const punctPositions: Array<{ idx: number; ch: string }> = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "." || text[i] === ",") {
      punctPositions.push({ idx: i, ch: text[i]! });
    } else if (!/\d/.test(text[i]!)) {
      // Stray character — treat as unparseable.
      return null;
    }
  }

  if (punctPositions.length === 0) {
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  }

  const last = punctPositions[punctPositions.length - 1]!;
  const tail = text.slice(last.idx + 1);
  const uniqueChars = new Set(punctPositions.map((p) => p.ch));

  // Case: single punctuation character type used throughout.
  if (uniqueChars.size === 1) {
    const only = last.ch;
    // Multiple occurrences → must be grouping. Strip and parse.
    if (punctPositions.length > 1) {
      const n = Number(text.split(only).join(""));
      return Number.isFinite(n) ? n : null;
    }
    // Single occurrence: decimal iff tail is 1–2 digits, else grouping.
    if (/^\d{1,2}$/.test(tail)) {
      const [intPart] = text.split(only);
      const n = Number(intPart + "." + tail);
      return Number.isFinite(n) ? n : null;
    }
    if (/^\d{3}$/.test(tail)) {
      const n = Number(text.split(only).join(""));
      return Number.isFinite(n) ? n : null;
    }
    // Tail of 4+ digits → treat the separator as decimal (unusual but
    // not impossible, e.g. scientific-like "12,34567" — best-effort).
    const [intPart] = text.split(only);
    const n = Number(intPart + "." + tail);
    return Number.isFinite(n) ? n : null;
  }

  // Case: mixed `,` and `.`. Last one is decimal; the other is grouping.
  const decimalChar = last.ch;
  const groupingChar = decimalChar === "." ? "," : ".";
  const withoutGrouping = text.split(groupingChar).join("");
  const [intPart, fracPart] = withoutGrouping.split(decimalChar);
  const n = Number(intPart + (fracPart !== undefined ? "." + fracPart : ""));
  return Number.isFinite(n) ? n : null;
}

// ---------------------------------------------------------------------------
// Public parser API
// ---------------------------------------------------------------------------

/**
 * Locale-aware money-string parser. Returns null on unparseable input.
 *
 * @example
 * parseAmount("1,234.56")                            // 1234.56 (en-US default)
 * parseAmount("1.234,56", { currency: "EUR" })       // 1234.56
 * parseAmount("1 234,56", { locale: "fr-FR" })       // 1234.56
 * parseAmount("(1,234.56)", { currency: "USD" })     // -1234.56
 * parseAmount("$1,234.56", { currency: "USD" })      // 1234.56
 * parseAmount("€1.234,56", { currency: "EUR" })      // 1234.56
 * parseAmount("CHF 1'234.56", { currency: "CHF" })   // 1234.56
 * parseAmount("¥1,234", { currency: "JPY" })         // 1234
 * parseAmount("₹1,23,456.78", { currency: "INR" })   // 123456.78
 * parseAmount("", { currency: "USD" })               // null
 * parseAmount("abc")                                 // null
 */
export function parseAmount(
  value: unknown,
  options?: ParseAmountOptions,
): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const raw = String(value).trim();
  if (!raw) return null;

  // Reject strings without any digits early — "N/A", "—", etc.
  if (!/\d/.test(raw)) return null;

  const { punctuation } = resolveLocalePunctuation(options);
  const stripped = stripPresentational(raw);
  const { text, negative } = stripped;
  if (!text) return null;

  // 1) Try locale-specific interpretation.
  let n = interpretWithLocale(text, punctuation);

  // 2) Fall back to heuristic (unless strict).
  if (n === null && !options?.strict) {
    n = interpretHeuristic(text);
  }

  if (n === null) return null;
  return negative ? -n : n;
}

/**
 * Convenience wrapper that returns 0 for unparseable input. Prefer this at
 * call sites that previously used a 0-fallback (the majority of provider
 * normalizers).
 *
 * @example
 * parseAmountOrZero("1,234.56")            // 1234.56
 * parseAmountOrZero("abc")                 // 0
 * parseAmountOrZero(undefined)             // 0
 */
export function parseAmountOrZero(
  value: unknown,
  options?: ParseAmountOptions,
): number {
  return parseAmount(value, options) ?? 0;
}

/**
 * Convenience wrapper for AP intake and other cent-integer sinks. Returns
 * null when parseAmount returns null; otherwise Math.round(value * 100).
 *
 * @example
 * parseAmountToCents("1,234.56")           // 123456
 * parseAmountToCents("1.234,56", { currency: "EUR" }) // 123456
 * parseAmountToCents("abc")                // null
 */
export function parseAmountToCents(
  value: unknown,
  options?: ParseAmountOptions,
): number | null {
  const n = parseAmount(value, options);
  if (n === null) return null;
  return Math.round(n * 100);
}
