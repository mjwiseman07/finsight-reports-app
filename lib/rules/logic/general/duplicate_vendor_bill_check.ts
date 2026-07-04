/**
 * @rule       gen.duplicate_vendor_bill_check
 * @assertions primary:existence_occurrence | secondary:accuracy
 * @accounts   accounts_payable, operating_expenses
 * @citation   ISA 315 ¶A190; PCAOB AS 12 fraud presumption
 */
import type { RuleContext, RuleResult } from "@/lib/rules/types";

export const ruleId = "gen.duplicate_vendor_bill_check";

// TODO(D5): detect duplicate bills — same vendor + amount within 30 days.
export async function execute(_context: RuleContext): Promise<RuleResult> {
  return { ruleId, status: "skip", findings: [], proposedActions: [], reviewNotes: [] };
}
