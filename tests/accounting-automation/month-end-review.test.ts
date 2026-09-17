import { describe, expect, it } from "vitest";
import type { AdvisacorNormalizedFinancialData } from "@/lib/integrations/accounting/types";
import { buildMonthEndReviewPackage } from "@/lib/accounting-automation/month-end-review";

function source(provider: "quickbooks" | "xero", report: string) {
  return { provider, providerFamily: provider, providerProduct: provider, sourceReport: report };
}

function payload(provider: "quickbooks" | "xero"): AdvisacorNormalizedFinancialData {
  return {
    sourceSystem: provider,
    reportPeriod: { startDate: "2026-08-01", endDate: "2026-08-31" },
    normalizedBalanceSheet: [
      { label: "Operating Checking", section: "Assets", amount: 1000, source: source(provider, "BalanceSheet") },
      { label: "Total Assets", section: "Assets", amount: 1000, source: source(provider, "BalanceSheet") },
      { label: "Total Liabilities", section: "Liabilities", amount: 400, source: source(provider, "BalanceSheet") },
      { label: "Total Equity", section: "Equity", amount: 600, source: source(provider, "BalanceSheet") },
    ],
    normalizedIncomeStatement: [],
    normalizedTransactions: [
      { id: "bank", name: "Ending Balance", amount: 1000, source: source(provider, "BankSummary") },
      { id: "ship", name: "Shipment fulfilled", amount: 250, metadata: { orderId: "SO-1" }, source: source(provider, "Orders") },
    ],
    normalizedARAging: [
      { id: "invoice", name: "Invoice open", amount: 250, metadata: { orderId: "SO-1" }, source: source(provider, "Invoices") },
    ],
    normalizedAPAging: [
      { id: "bill", name: "Vendor bill posted unpaid", amount: 75, metadata: { postedAt: "2026-08-30" }, source: source(provider, "Bills") },
    ],
  } as unknown as AdvisacorNormalizedFinancialData;
}

describe("month-end review package", () => {
  it.each(["quickbooks", "xero"] as const)("produces the same governed result for %s normalized data", (provider) => {
    const result = buildMonthEndReviewPackage({ payload: payload(provider) });
    expect(result).toMatchObject({
      status: "ready",
      provider,
      period_end: "2026-08-31",
      review_only: true,
      provider_writes: false,
      sections: {
        balance_sheet: { status: "tie", equation_variance_cents: 0 },
        bank_cash: { status: "reconciled", variance_cents: 0 },
        revenue_cutoff: { status: "clear" },
        expense_cutoff: { status: "clear" },
      },
    });
  });

  it("carries weekly exceptions into reviewer actions and blocks on missing evidence", () => {
    const data = payload("xero");
    data.normalizedTransactions = [];
    const result = buildMonthEndReviewPackage({
      payload: data,
      weeklyFindings: [{ category: "source_data", code: "accounting_snapshot_stale", severity: "block", item_count: 1, amount_cents: null, evidence: {} }],
    });
    expect(result.status).toBe("blocked");
    expect(result.sections.weekly_open_findings).toEqual({ count: 1, blocking: 1, review: 0 });
    expect(result.reviewer_actions).toEqual(expect.arrayContaining(["obtain_bank_closing_balance_evidence", "resolve_open_weekly_findings"]));
  });

  it("requires review when the balance-sheet equation does not tie", () => {
    const data = payload("quickbooks");
    data.normalizedBalanceSheet = data.normalizedBalanceSheet.map((row) => row.label === "Total Equity" ? { ...row, amount: 550 } : row);
    const result = buildMonthEndReviewPackage({ payload: data });
    expect(result.status).toBe("review_required");
    expect(result.sections.balance_sheet).toMatchObject({ status: "review_required", equation_variance_cents: 5000 });
  });
});
