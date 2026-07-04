/**
 * @rule       gen.je_period_check
 * @assertions primary:cutoff | secondary:existence_occurrence
 * @accounts   revenue, operating_expenses, cost_of_goods_sold
 * @citation   ISA 315 ¶A190; ASC 720
 */
import type { RuleContext, RuleResult } from "@/lib/rules/types";

export const ruleId = "gen.je_period_check";

// TODO(D3): verify JEs post to the correct open period, not a locked prior period.
export async function execute(_context: RuleContext): Promise<RuleResult> {
  return { ruleId, status: "skip", findings: [], proposedActions: [], reviewNotes: [] };
}
