import { describe, expect, it } from "vitest";
import type { AdvisacorNormalizedFinancialData } from "@/lib/integrations/accounting/types";
import { reconcileBankCashSnapshot } from "@/lib/accounting-automation/bank-cash-reconciliation";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    normalizedBalanceSheet: [{ label: "Operating Checking", section: "Assets", amount: 1000, source: { provider: "xero", providerFamily: "xero", providerProduct: "xero", sourceReport: "BalanceSheet" } }],
    normalizedTransactions: [{ id: "bank-1", name: "Ending Balance", amount: 1000, source: { provider: "xero", providerFamily: "xero", providerProduct: "xero", sourceReport: "BankSummary" } }],
    ...overrides,
  } as unknown as AdvisacorNormalizedFinancialData;
}

describe("bank/cash reconciliation", () => {
  it("reconciles an explicit bank closing balance to GL cash", () => {
    expect(reconcileBankCashSnapshot(payload())).toMatchObject({
      status: "reconciled",
      bank_balance_cents: 100000,
      gl_cash_balance_cents: 100000,
      variance_cents: 0,
    });
  });

  it("returns a review variance and unresolved count", () => {
    const result = reconcileBankCashSnapshot(payload({
      normalizedTransactions: [
        { id: "bank-1", name: "Ending Balance", amount: 950, source: { sourceReport: "BankSummary" } },
        { id: "bank-2", name: "Outstanding check", amount: 50, source: { sourceReport: "BankSummary" } },
      ],
    }));
    expect(result).toMatchObject({ status: "review_required", variance_cents: -5000, unresolved_item_count: 1 });
  });

  it("fails closed rather than treating transactions as a statement balance", () => {
    const result = reconcileBankCashSnapshot(payload({
      normalizedTransactions: [{ id: "txn", name: "Deposit", amount: 1000, source: { sourceReport: "BankTransactions" } }],
    }));
    expect(result).toMatchObject({ status: "unavailable", bank_balance_cents: null });
    expect(result.evidence_codes).toContain("bank_closing_balance_unavailable");
  });
});
