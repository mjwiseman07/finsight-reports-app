import type { RuleContext, RuleResult } from "@/lib/rules/types";

export const ruleId = "gen.cash_negative_check";

// TODO(D4): flag cash/bank accounts carrying negative balances at period end.
export async function execute(_context: RuleContext): Promise<RuleResult> {
  return { ruleId, status: "skip", findings: [], proposedActions: [], reviewNotes: [] };
}
