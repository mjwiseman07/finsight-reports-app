import { describe, expect, it, vi } from "vitest";
import type { AdvisacorNormalizedFinancialData } from "@/lib/integrations/accounting/types";
import { evaluateWeeklyCompleteness, runRaProWeeklyCompleteness, utcWeekEnding } from "@/lib/accounting-automation/weekly-completeness";

function row(id: string, name: string, sourceReport: string, amount = 0, metadata: Record<string, unknown> = {}) {
  return { id, name, amount, metadata, source: { provider: "xero" as const, providerFamily: "xero", providerProduct: "xero", sourceReport } };
}

function payload(overrides: Partial<AdvisacorNormalizedFinancialData> = {}): AdvisacorNormalizedFinancialData {
  return {
    sourceSystem: "xero",
    adapterName: "xero",
    companyId: "company-1",
    connectionId: "connection-1",
    tenantId: "tenant-1",
    tenantName: "Tenant",
    syncId: "sync-1",
    reportPeriod: { startDate: "2026-09-01", endDate: "2026-09-14" },
    mappedAt: "2026-09-14T04:00:00.000Z",
    rawReportsPulled: { accounts: true, trialBalance: true, balanceSheet: true, incomeStatement: true, arAging: true, apAging: true },
    syncStatus: "SUCCESS",
    lastSyncedAt: "2026-09-14T04:00:00.000Z",
    normalizedAccounts: [],
    normalizedTransactions: [row("bank-1", "Ending Balance", "Bank Summary", 0)],
    normalizedTrialBalance: [],
    normalizedBalanceSheet: [{ label: "Operating Checking", amount: 0, section: "Assets", source: { provider: "xero", providerFamily: "xero", providerProduct: "xero", sourceReport: "BalanceSheet" } }],
    normalizedIncomeStatement: [],
    normalizedARAging: [row("ar-1", "Current invoice", "AR Aging", 200)],
    normalizedAPAging: [row("ap-1", "Vendor bill posted unpaid", "AP Aging", 50, { postedAt: "2026-09-15" })],
    normalizedBudgets: [],
    normalizedDepartments: [],
    normalizedLocations: [],
    normalizedClasses: [],
    normalizedProjects: [],
    normalizedVendors: [],
    normalizedCustomers: [],
    validation: { readyForReporting: true, missingObjects: [], warnings: [] },
    ...overrides,
  } as AdvisacorNormalizedFinancialData;
}

describe("weekly completeness evaluator", () => {
  it("uses a deterministic UTC Sunday week ending", () => {
    expect(utcWeekEnding(new Date("2026-09-17T23:00:00Z"))).toBe("2026-09-20");
    expect(utcWeekEnding(new Date("2026-09-20T01:00:00Z"))).toBe("2026-09-20");
  });

  it("surfaces review aggregates without authorizing provider writes", () => {
    const findings = evaluateWeeklyCompleteness({
      payload: payload({
        normalizedTransactions: [
          row("bank-1", "Unreconciled deposit", "Bank Summary", 125),
          row("order-1", "Shipment awaiting invoice", "Sales Orders", 400),
        ],
        normalizedARAging: [row("ar-1", "Invoice 61-90 overdue", "AR Aging", 250)],
        normalizedAPAging: [row("ap-1", "Bill past due", "AP Aging", 75)],
      }),
      syncedAt: "2026-09-17T03:00:00Z",
      now: new Date("2026-09-17T06:00:00Z"),
    });

    expect(findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "bank_activity_requires_review", item_count: 1, amount_cents: 12500 }),
      expect.objectContaining({ code: "overdue_receivables_require_review", amount_cents: 25000 }),
      expect.objectContaining({ code: "overdue_payables_require_review", amount_cents: 7500 }),
    ]));
    expect(findings.some((finding) => finding.code === "order_to_invoice_evidence_unavailable")).toBe(false);
    expect(findings.find((finding) => finding.code === "overdue_payables_require_review")?.evidence).toMatchObject({ payment_execution: "human_only" });
  });

  it("fails closed when required weekly source evidence is missing or stale", () => {
    const findings = evaluateWeeklyCompleteness({
      payload: payload({ normalizedTransactions: [], normalizedARAging: [], normalizedAPAging: [] }),
      syncedAt: "2026-09-14T00:00:00Z",
      now: new Date("2026-09-17T06:00:00Z"),
    });
    expect(findings.filter((finding) => finding.severity === "block").map((finding) => finding.code)).toEqual(expect.arrayContaining([
      "accounting_snapshot_stale",
      "bank_activity_evidence_unavailable",
      "ar_aging_evidence_unavailable",
      "ap_aging_evidence_unavailable",
    ]));
  });

  it("persists one idempotent review input per eligible client", async () => {
    const persist = vi.fn().mockResolvedValue(undefined);
    const result = await runRaProWeeklyCompleteness({
      now: new Date("2026-09-17T06:00:00Z"),
      loadCandidates: async () => [{
        firm_id: "firm-1",
        firm_client_id: "client-1",
        company_id: "company-1",
        accounting_sync_id: "sync-1",
        provider: "xero",
        synced_at: "2026-09-17T05:00:00Z",
        normalized_payload: payload(),
      }],
      persist,
    });
    expect(result).toMatchObject({ status: "ok", eligible_clients: 1, completed: 1, failed: 0 });
    expect(persist).toHaveBeenCalledOnce();
    expect(persist.mock.calls[0][0]).toMatchObject({ week_ending: "2026-09-20", finding_count: 1, status: "review_required" });
    expect(persist.mock.calls[0][0].idempotency_key).toMatch(/^[a-f0-9]{64}$/);
  });
});
