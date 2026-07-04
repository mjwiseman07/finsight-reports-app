/**
 * @rule       gen.je_balance_check
 * @assertions primary:accuracy | secondary:completeness
 * @accounts   revenue, operating_expenses, cost_of_goods_sold, accounts_payable, accounts_receivable
 * @citation   FASB Concepts Statement 5; ISA 315 ¶A190
 */
import type { RuleContext, RuleResult } from "@/lib/rules/types";

export const ruleId = "gen.je_balance_check";

// TODO(D3): verify every journal entry has debits == credits for the period.
export async function execute(_context: RuleContext): Promise<RuleResult> {
  return { ruleId, status: "skip", findings: [], proposedActions: [], reviewNotes: [] };
}
