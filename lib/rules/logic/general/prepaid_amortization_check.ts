/**
 * @rule       gen.prepaid_amortization_check
 * @assertions primary:valuation_allocation | secondary:cutoff,completeness
 * @accounts   other_current_assets, operating_expenses
 * @citation   ASC 340
 */
import type { RuleContext, RuleResult } from "@/lib/rules/types";

export const ruleId = "gen.prepaid_amortization_check";

// TODO(D7): verify recurring monthly prepaid amortization posts each period.
export async function execute(_context: RuleContext): Promise<RuleResult> {
  return { ruleId, status: "skip", findings: [], proposedActions: [], reviewNotes: [] };
}
