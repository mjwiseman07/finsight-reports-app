import type { RuleContext, RuleResult } from "@/lib/rules/types";

export const ruleId = "gen.ap_missed_vendor_check";

// TODO(D5): detect monthly vendors with no bill/accrual this period (needs 3mo history).
export async function execute(_context: RuleContext): Promise<RuleResult> {
  return { ruleId, status: "skip", findings: [], proposedActions: [], reviewNotes: [] };
}
