import type { RuleContext, RuleResult } from "@/lib/rules/types";

export const ruleId = "gen.duplicate_vendor_bill_check";

// TODO(D5): detect duplicate bills — same vendor + amount within 30 days.
export async function execute(_context: RuleContext): Promise<RuleResult> {
  return { ruleId, status: "skip", findings: [], proposedActions: [], reviewNotes: [] };
}
