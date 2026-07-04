/**
 * D6.4c-1 — Basis guard. PURE function. Zero DB, zero network, zero clock.
 *
 * Given (engagement basis, rule's basis scope, proposal shape), decide whether
 * the proposal is allowed. Cash-basis engagements are conservative (Option B):
 * they reject anything the rule registry marks as accrual-only.
 *
 * The guard captures the block reason as a structured code AND authoritative
 * human text — both are persisted so reviewer messaging survives frontend
 * redeploys.
 */
import {
  BASIS_GUARD_REASON_TEXT,
  type BasisGuardReasonCode,
} from "./reasons";

export type AccountingMethod = "cash" | "accrual" | "modified_cash";

export interface RuleBasisScope {
  applies_to_cash_basis: boolean;
  applies_to_accrual_basis: boolean;
  // Note: modified_cash is treated as accrual-compatible for D6.4c-1 (the
  // execution service already skips gating on it; we mirror that).
}

export interface ProposalShapeHint {
  /**
   * If the proposal contains an accrual line (e.g., debit expense + credit
   * accrued liability, or debit contract asset + credit revenue), it is
   * accrual-flavored regardless of what the rule scope declares. This is
   * belt-and-suspenders: a bug in the rule registry cannot slip an accrual
   * onto a cash engagement.
   */
  hasAccrualLine: boolean;
}

export interface BasisGuardInput {
  engagementMethod: AccountingMethod | string | null;
  ruleScope: RuleBasisScope;
  proposalShape: ProposalShapeHint;
  ruleId: string;
}

export interface BasisGuardResult {
  allowed: boolean;
  reason_code: BasisGuardReasonCode | null;
  reason_text: string | null;
}

const KNOWN_METHODS: readonly AccountingMethod[] = [
  "cash",
  "accrual",
  "modified_cash",
];

export function applyBasisGuard(input: BasisGuardInput): BasisGuardResult {
  const { engagementMethod, ruleScope, proposalShape, ruleId } = input;

  // 1. Unknown engagement method -> block
  if (
    engagementMethod === null ||
    !(KNOWN_METHODS as readonly string[]).includes(engagementMethod)
  ) {
    return {
      allowed: false,
      reason_code: "unknown_accounting_method",
      reason_text: BASIS_GUARD_REASON_TEXT.unknown_accounting_method,
    };
  }

  // 2. Rule registry missing both scopes -> block (registry bug)
  if (!ruleScope.applies_to_cash_basis && !ruleScope.applies_to_accrual_basis) {
    return {
      allowed: false,
      reason_code: "rule_missing_basis_scope",
      reason_text: `${BASIS_GUARD_REASON_TEXT.rule_missing_basis_scope} (rule=${ruleId})`,
    };
  }

  // 3. Cash-basis engagement + rule declares accrual-only OR proposal contains accrual line
  if (engagementMethod === "cash") {
    if (!ruleScope.applies_to_cash_basis || proposalShape.hasAccrualLine) {
      return {
        allowed: false,
        reason_code: "basis_mismatch_accrual_on_cash",
        reason_text: `${BASIS_GUARD_REASON_TEXT.basis_mismatch_accrual_on_cash} (rule=${ruleId})`,
      };
    }
  }

  // 4. Modified-cash engagement + rule is accrual-only -> block (Option B conservative)
  if (engagementMethod === "modified_cash") {
    if (!ruleScope.applies_to_cash_basis) {
      return {
        allowed: false,
        reason_code: "basis_mismatch_modified_cash_accrual_rule",
        reason_text: `${BASIS_GUARD_REASON_TEXT.basis_mismatch_modified_cash_accrual_rule} (rule=${ruleId})`,
      };
    }
  }

  return { allowed: true, reason_code: null, reason_text: null };
}
