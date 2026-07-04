/**
 * @rule       gen.ap_missed_vendor_check
 * @assertions primary:completeness | secondary:cutoff
 * @accounts   accounts_payable, operating_expenses
 * @citation   AICPA Audit Guide ch. 10
 */
import type { RuleContext, RuleResult } from "@/lib/rules/types";

export const ruleId = "gen.ap_missed_vendor_check";

// TODO(D5): detect monthly vendors with no bill/accrual this period (needs 3mo history).
export async function execute(_context: RuleContext): Promise<RuleResult> {
  return { ruleId, status: "skip", findings: [], proposedActions: [], reviewNotes: [] };
}
