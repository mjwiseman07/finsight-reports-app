/**
 * Phase MC-2d.3a fixture — mirrors the three module-scoped currency
 * formatters in `app/upload/page.tsx`. Kept intentionally colocated with
 * the test suite so drift is visible at review time. MC-2d.3c will delete
 * this fixture once the formatters move into `lib/format/board-package.ts`.
 *
 * If you edit `formatCurrency`, `formatMoneyLegacy`, or
 * `formatOptionalCurrency` in `app/upload/page.tsx`, you MUST make the
 * identical edit here or the test suite goes stale.
 */
import {
  DEFAULT_FALLBACK_CURRENCY,
  isValidCurrencyCode,
  formatMoney as formatMoneyShared,
} from "../../../lib/format/money";

export function formatCurrency(
  value: number | null | undefined,
  currency: string | null | undefined = DEFAULT_FALLBACK_CURRENCY,
) {
  if (value === null || value === undefined) return "";

  const amount = Math.round(value);
  const resolvedCurrency =
    typeof currency === "string" && isValidCurrencyCode(currency)
      ? currency
      : DEFAULT_FALLBACK_CURRENCY;

  const formatted = formatMoneyShared(Math.abs(amount), resolvedCurrency, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    signDisplay: "never",
  });

  return amount < 0 ? `(${formatted})` : formatted;
}

export function formatMoneyLegacy(
  value: number | null | undefined,
  currency: string | null | undefined = DEFAULT_FALLBACK_CURRENCY,
) {
  return formatCurrency(value ?? 0, currency);
}

export function formatOptionalCurrency(
  value: number | null | undefined,
  fallback: string = "Not found",
  currency: string | null | undefined = DEFAULT_FALLBACK_CURRENCY,
) {
  return value === null || value === undefined ? fallback : formatCurrency(value, currency);
}
