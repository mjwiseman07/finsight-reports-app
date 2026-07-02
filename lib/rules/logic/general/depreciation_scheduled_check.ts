import type { RuleContext, RuleResult } from "@/lib/rules/types";

export const ruleId = "gen.depreciation_scheduled_check";

// TODO(D7): verify recurring monthly depreciation posts per fixed asset register.
export async function execute(_context: RuleContext): Promise<RuleResult> {
  return { ruleId, status: "skip", findings: [], proposedActions: [], reviewNotes: [] };
}
