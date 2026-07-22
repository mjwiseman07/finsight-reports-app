/**
 * QBO sign-convention normalization for BS reconciliation tie-out.
 *
 * QBO exposes two different sign conventions across two reports we rely on:
 *
 *   - fetchQboGeneralLedgerDetail → endingBalanceCents
 *     Sourced from the running-balance column of the GL detail report.
 *     Uses QBO's NATURAL-SIGN convention (same as the QBO Balance Sheet
 *     UI): credit-normal balances (Liabilities, Equity, Credit Cards)
 *     appear POSITIVE. Contra-assets (e.g. Accumulated Depreciation)
 *     appear NEGATIVE inside the Asset section.
 *
 *   - fetchQboTrialBalance → net_cents (= debit − credit)
 *     Uses SIGNED convention. Credit-normal balances appear NEGATIVE.
 *     Debit-normal balances appear POSITIVE.
 *
 * Both conventions agree on classification=Asset (debit-normal). They
 * disagree on classification=Liability and classification=Equity
 * (credit-normal), where the TB value must be negated to match the GL
 * natural-sign value.
 *
 * All downstream storage, PDFs, and aggregation use natural-sign
 * convention (matches QBO's BS UI, matches user expectations). This
 * function normalizes TB net_cents into that convention before comparison.
 */

export type BsClassification = "Asset" | "Liability" | "Equity";

/**
 * Convert a QBO Trial Balance net_cents value into QBO's natural-sign
 * convention. Asset classification passes through; Liability and Equity
 * negate.
 *
 * Zero maps to zero for all classifications.
 */
export function normalizeTbNetToNaturalSign(
  tbNetCents: number,
  classification: BsClassification,
): number {
  if (tbNetCents === 0) return 0;
  return classification === "Asset" ? tbNetCents : -tbNetCents;
}
