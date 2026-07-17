/**
 * lib/format/money.ts
 *
 * Shared currency-aware money formatter — introduced by Phase MC-2a of
 * Issue #6 (Intuit App Store multicurrency compliance).
 *
 * Context
 * -------
 * Prior to this file, every user-facing money value in the app was formatted
 * with an ad-hoc `Intl.NumberFormat("en-US", { style: "currency", currency:
 * "USD" })` call or a hardcoded `` `$${amount.toLocaleString()}` `` template.
 * The Issue #6 gap analysis identified ~150 such sites (Gaps U-1, U-2, U-3,
 * R-1, R-2, R-4). A non-USD company (e.g. a Canadian sandbox with
 * `home_currency = "CAD"`) would see `$` and en-US grouping on every figure
 * regardless of the true home currency.
 *
 * This module is the single place any part of the app should reach for when
 * it needs to render an amount as money. All downstream migrations (MC-2b:
 * close-packet, MC-2c: financial-package PDF, MC-2d: UI) migrate to
 * `formatMoney` and read the currency code from
 * `bundle.sourceMetadata.home_currency` (populated in MC-1) or from the
 * per-row currency where the domain carries one (AP/AR).
 *
 * Rule for consumers
 * ------------------
 * NEVER hardcode a currency code. Always read it from:
 *   1) A per-row `currency` column (AP/AR/refunds), or
 *   2) `bundle.sourceMetadata.home_currency` (report-derived UI/PDF), or
 *   3) `DEFAULT_FALLBACK_CURRENCY` when both are absent.
 *
 * The formatter is intentionally locale-flexible. Prefer passing an explicit
 * `locale` when the calling context knows one (e.g. a fr-CA user); omit
 * `locale` to let `Intl.NumberFormat` pick a sane default.
 */

export const DEFAULT_FALLBACK_CURRENCY = "USD";
export const PLACEHOLDER = "—";

export interface FormatMoneyOptions {
  /** BCP-47 locale (e.g. "en-US", "fr-CA", "de-DE"). Omit for runtime default. */
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  /** Mirrors Intl.NumberFormat signDisplay. */
  signDisplay?: "auto" | "always" | "exceptZero" | "negative" | "never";
  /** "standard" for full digits; "compact" for e.g. $1.23M. */
  notation?: "standard" | "compact";
  /** For notation:"compact", "short" (default) → $1.2M, "long" → $1.2 million. */
  compactDisplay?: "short" | "long";
}

/**
 * Returns `true` when the given 3-letter ISO 4217 code is accepted by the
 * runtime's `Intl.NumberFormat`. Used internally by the fallback path; also
 * exported for callers that want to pre-validate before storing.
 *
 * @example
 * isValidCurrencyCode("USD") // true
 * isValidCurrencyCode("XYZ") // false
 * isValidCurrencyCode("us")  // false (case + length gate)
 */
export function isValidCurrencyCode(code: string): boolean {
  if (typeof code !== "string") return false;
  if (!/^[A-Z]{3}$/.test(code)) return false;
  try {
    // Prefer the ICU-supported currency registry when available — some runtimes
    // accept arbitrary 3-letter codes in NumberFormat without throwing.
    if (typeof Intl.supportedValuesOf === "function") {
      return Intl.supportedValuesOf("currency").includes(code);
    }
    // eslint-disable-next-line no-new
    new Intl.NumberFormat(undefined, { style: "currency", currency: code });
    return true;
  } catch {
    return false;
  }
}

function resolveCurrency(code: string | null | undefined): string {
  if (typeof code === "string" && isValidCurrencyCode(code)) return code;
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(
      `[lib/format/money] Unknown/invalid currency code ${JSON.stringify(
        code,
      )} — falling back to ${DEFAULT_FALLBACK_CURRENCY}.`,
    );
  }
  return DEFAULT_FALLBACK_CURRENCY;
}

/**
 * Format an amount as a currency-aware string.
 *
 * Behavior:
 * - `NaN` / `Infinity` / `null` / `undefined` → returns {@link PLACEHOLDER} ("—").
 * - Unknown currency code → falls back to {@link DEFAULT_FALLBACK_CURRENCY}
 *   with a dev-only `console.warn`.
 * - Locale defaults to the runtime default when omitted.
 *
 * Enables closing Gaps U-1, U-2, U-3, R-1, R-2, R-4 as consumers migrate to
 * it in Phases MC-2b through MC-2d.
 *
 * @example
 * formatMoney(1234.56, "USD")            // "$1,234.56"
 * formatMoney(1234.56, "CAD", { locale: "en-CA" }) // "$1,234.56"
 * formatMoney(1234.56, "EUR", { locale: "de-DE" }) // "1.234,56 €"
 * formatMoney(-42, "USD", { signDisplay: "always" })  // "-$42.00"
 * formatMoney(1_234_567, "USD", { notation: "compact" }) // "$1.23M"
 * formatMoney(NaN, "USD")                // "—"
 * formatMoney(1234, "XYZ")               // warns, returns "$1,234.00"
 */
export function formatMoney(
  amount: number | null | undefined,
  currencyCode: string | null | undefined,
  options: FormatMoneyOptions = {},
): string {
  if (amount === null || amount === undefined) return PLACEHOLDER;
  if (typeof amount !== "number" || !Number.isFinite(amount)) return PLACEHOLDER;

  const currency = resolveCurrency(currencyCode);
  const {
    locale,
    minimumFractionDigits,
    maximumFractionDigits,
    signDisplay,
    notation,
    compactDisplay,
  } = options;

  const nfOptions: Intl.NumberFormatOptions = {
    style: "currency",
    currency,
  };
  if (typeof minimumFractionDigits === "number") {
    nfOptions.minimumFractionDigits = minimumFractionDigits;
  }
  if (typeof maximumFractionDigits === "number") {
    nfOptions.maximumFractionDigits = maximumFractionDigits;
  }
  if (signDisplay) nfOptions.signDisplay = signDisplay;
  if (notation) nfOptions.notation = notation;
  if (compactDisplay) nfOptions.compactDisplay = compactDisplay;

  try {
    return new Intl.NumberFormat(locale, nfOptions).format(amount);
  } catch (err) {
    // Extremely rare — a malformed locale would land here. Retry without locale.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        `[lib/format/money] formatMoney failed for locale=${JSON.stringify(
          locale,
        )}, currency=${JSON.stringify(currency)}: ${String(
          (err as Error)?.message ?? err,
        )}. Retrying without locale.`,
      );
    }
    return new Intl.NumberFormat(undefined, nfOptions).format(amount);
  }
}

/**
 * Compact currency formatter — for KPI cards, dashboard tiles, and any
 * space-constrained readout.
 *
 * @example
 * formatMoneyCompact(1_234_567, "USD") // "$1.23M"
 * formatMoneyCompact(2_500, "USD")     // "$2.5K"
 */
export function formatMoneyCompact(
  amount: number | null | undefined,
  currencyCode: string | null | undefined,
  options: Omit<FormatMoneyOptions, "notation"> = {},
): string {
  return formatMoney(amount, currencyCode, { ...options, notation: "compact" });
}

/**
 * Return just the currency symbol (or a locale-specific narrow form) for a
 * given code. Falls back to the ISO code itself when the runtime can't
 * derive a symbol.
 *
 * @example
 * getCurrencySymbol("USD")           // "$"
 * getCurrencySymbol("EUR")           // "€"
 * getCurrencySymbol("CAD")           // "CA$"  (in en-US)
 * getCurrencySymbol("CAD", "en-CA")  // "$"
 * getCurrencySymbol("XYZ")           // "XYZ"  (fallback: returns the code)
 */
export function getCurrencySymbol(
  currencyCode: string,
  locale?: string,
): string {
  const currency = resolveCurrency(currencyCode);
  try {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      // 0 amount → symbol still emitted, digit noise minimized
    }).formatToParts(0);
    const symbol = parts.find((p) => p.type === "currency")?.value;
    return symbol || currency;
  } catch {
    return currency;
  }
}
