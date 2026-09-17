import type { AdvisacorNormalizedEntity, AdvisacorNormalizedFinancialData } from "@/lib/integrations/accounting/types";

export type BankCashReconciliation = {
  status: "reconciled" | "review_required" | "unavailable";
  bank_balance_cents: number | null;
  gl_cash_balance_cents: number | null;
  variance_cents: number | null;
  unresolved_item_count: number;
  evidence_codes: string[];
};

function cents(value: number): number {
  return Math.round(value * 100);
}

function entityText(row: AdvisacorNormalizedEntity): string {
  return `${row.name || ""} ${row.type || ""} ${row.source?.sourceReport || ""} ${JSON.stringify(row.metadata || {})}`.toLowerCase();
}

function entityValue(row: AdvisacorNormalizedEntity): number {
  const value = Number(row.amount ?? row.balance ?? row.metadata?.amount ?? row.metadata?.balance);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Conservative bank-to-GL comparison over a normalized provider snapshot.
 * It never treats generic transaction totals as a bank statement balance.
 */
export function reconcileBankCashSnapshot(
  payload: AdvisacorNormalizedFinancialData,
  toleranceCents = 100,
): BankCashReconciliation {
  const cashRows = (payload.normalizedBalanceSheet || []).filter((row) => {
    const label = `${row.label || ""} ${row.section || ""}`.toLowerCase();
    return /cash|checking|savings|bank account/.test(label) && !/total cash|cash and cash equivalents/.test(label);
  });
  const glCash = cashRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  const bankRows = (payload.normalizedTransactions || []).filter((row) => /bank\s*summary/i.test(String(row.source?.sourceReport || "")));
  const closingRows = bankRows.filter((row) => /closing balance|ending balance|bank balance/.test(entityText(row)));
  const unresolvedRows = bankRows.filter((row) => /unmatched|unreconciled|uncleared|outstanding|pending/.test(entityText(row)));

  const evidenceCodes: string[] = [];
  if (!cashRows.length) evidenceCodes.push("gl_cash_control_unavailable");
  if (!closingRows.length) evidenceCodes.push("bank_closing_balance_unavailable");

  if (evidenceCodes.length) {
    return {
      status: "unavailable",
      bank_balance_cents: closingRows.length ? cents(closingRows.reduce((sum, row) => sum + entityValue(row), 0)) : null,
      gl_cash_balance_cents: cashRows.length ? cents(glCash) : null,
      variance_cents: null,
      unresolved_item_count: unresolvedRows.length,
      evidence_codes: evidenceCodes,
    };
  }

  const bankBalanceCents = cents(closingRows.reduce((sum, row) => sum + entityValue(row), 0));
  const glCashBalanceCents = cents(glCash);
  const varianceCents = bankBalanceCents - glCashBalanceCents;
  return {
    status: Math.abs(varianceCents) <= toleranceCents && unresolvedRows.length === 0 ? "reconciled" : "review_required",
    bank_balance_cents: bankBalanceCents,
    gl_cash_balance_cents: glCashBalanceCents,
    variance_cents: varianceCents,
    unresolved_item_count: unresolvedRows.length,
    evidence_codes: unresolvedRows.length ? ["unresolved_bank_items_present"] : [],
  };
}
