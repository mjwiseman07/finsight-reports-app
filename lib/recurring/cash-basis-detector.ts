// D5.6 — pure cash-basis detector. No DB, no clock, no env, no imports.
// Strict "cash" match — mirrors D5.4 auto-post-gate.ts convention.
// "modified_cash" and other future methods are NOT cash-basis.

/**
 * Return true iff the client's accounting_method is exactly "cash".
 * Null / undefined / empty string / any other value returns false.
 */
export function isCashBasisClient(
  accountingMethod: string | null | undefined,
): boolean {
  return accountingMethod === "cash";
}
