/**
 * D6.4c-1 — Enumerated block reasons for the basis guard.
 *
 * Every basis-guard block MUST use one of these codes. The human-readable
 * `text` is authoritative and persisted in `pre_close_review_items.basis_guard_reason_text`
 * — reviewer UI reads it directly. Adding a code is an additive change;
 * removing one requires a migration + backfill of dependent audit rows.
 */
export const BASIS_GUARD_REASON_CODES = [
  "basis_mismatch_accrual_on_cash",
  "basis_mismatch_modified_cash_accrual_rule",
  "unknown_accounting_method",
  "rule_missing_basis_scope",
] as const;

export type BasisGuardReasonCode = (typeof BASIS_GUARD_REASON_CODES)[number];

export const BASIS_GUARD_REASON_TEXT: Record<BasisGuardReasonCode, string> = {
  basis_mismatch_accrual_on_cash:
    "Rule proposes an accrual-flavored journal entry; this engagement is on cash basis. Proposal suppressed to preserve cash-basis integrity.",
  basis_mismatch_modified_cash_accrual_rule:
    "Rule requires full accrual scope; this engagement is on modified cash basis. Proposal suppressed pending explicit modified-cash policy.",
  unknown_accounting_method:
    "Engagement accounting_method is unrecognized. Proposal suppressed; correct the engagement configuration.",
  rule_missing_basis_scope:
    "Rule registry row is missing both applies_to_cash_basis and applies_to_accrual_basis. Proposal suppressed pending registry fix.",
};

export function isBasisGuardReasonCode(x: unknown): x is BasisGuardReasonCode {
  return (
    typeof x === "string" &&
    (BASIS_GUARD_REASON_CODES as readonly string[]).includes(x)
  );
}
