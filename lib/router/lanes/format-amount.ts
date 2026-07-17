/**
 * Deterministic amount formatter for machine-consumable disclosure-emitter
 * text. User-facing rendered money should use lib/format/money.ts instead.
 */
import {
  DEFAULT_FALLBACK_CURRENCY,
  isValidCurrencyCode,
} from "@/lib/format/money";

function resolveEmitterCurrency(code: string | null | undefined): string {
  const normalized = typeof code === "string" ? code.toUpperCase() : code;
  if (typeof normalized === "string" && isValidCurrencyCode(normalized)) {
    return normalized;
  }

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.warn(
      `[lib/router/lanes/format-amount] Missing or invalid presentation_currency (${JSON.stringify(
        code,
      )}); falling back to ${DEFAULT_FALLBACK_CURRENCY}.`,
    );
  }

  return DEFAULT_FALLBACK_CURRENCY;
}

/**
 * Format an amount with deterministic grouping and an explicit ISO code.
 *
 * @example formatAmountForEmitter(1234.5, "CAD") // "1,234.5 CAD"
 */
export function formatAmountForEmitter(
  amount: number,
  currency: string | null | undefined,
): string {
  const grouped = amount.toLocaleString("en-US");
  return `${grouped} ${resolveEmitterCurrency(currency)}`;
}

export const EMITTER_CURRENCY_FALLBACK = DEFAULT_FALLBACK_CURRENCY;
