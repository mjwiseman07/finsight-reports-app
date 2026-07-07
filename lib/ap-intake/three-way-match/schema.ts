export const TOLERANCE_PCT = 0.02;   // 2% price variance
export const OVER_RECEIPT_PCT = 1.05; // 105% quantity ceiling
export const AMOUNT_FLOOR_CENTS = 100;
export function computeAllowedDelta(invoiceAmountCents: number): number {
  return Math.max(
    Math.round(invoiceAmountCents * TOLERANCE_PCT),
    AMOUNT_FLOOR_CENTS,
  );
}
