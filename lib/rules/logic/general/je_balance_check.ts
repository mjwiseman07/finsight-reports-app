import type { RuleContext, RuleResult } from "@/lib/rules/types";

export const ruleId = "gen.je_balance_check";

// TODO(D3): verify every journal entry has debits == credits for the period.
export async function execute(_context: RuleContext): Promise<RuleResult> {
  return { ruleId, status: "skip", findings: [], proposedActions: [], reviewNotes: [] };
}
