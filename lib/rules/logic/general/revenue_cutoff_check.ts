import type { RuleContext, RuleResult } from "@/lib/rules/types";

export const ruleId = "gen.revenue_cutoff_check";

// TODO(D6): check ship/delivery dates crossing period end for revenue recognition.
export async function execute(_context: RuleContext): Promise<RuleResult> {
  return { ruleId, status: "skip", findings: [], proposedActions: [], reviewNotes: [] };
}
