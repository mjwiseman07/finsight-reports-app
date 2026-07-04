/**
 * @rule       gen.revenue_cutoff_check
 * @assertions primary:cutoff | secondary:existence_occurrence,accuracy
 * @accounts   revenue, accounts_receivable
 * @citation   ASC 606-10-25
 */
import type { RuleContext, RuleResult } from "@/lib/rules/types";

export const ruleId = "gen.revenue_cutoff_check";

// TODO(D6): check ship/delivery dates crossing period end for revenue recognition.
export async function execute(_context: RuleContext): Promise<RuleResult> {
  return { ruleId, status: "skip", findings: [], proposedActions: [], reviewNotes: [] };
}
