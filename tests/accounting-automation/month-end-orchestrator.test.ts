import { describe, expect, it, vi } from "vitest";
import type { AdvisacorNormalizedFinancialData } from "@/lib/integrations/accounting/types";
import { priorUtcMonthEnd, runRaProMonthEndReview } from "@/lib/accounting-automation/month-end-orchestrator";
import { selectLatestSyncByCompany } from "@/lib/accounting-automation/weekly-completeness";

const payload = {
  sourceSystem: "quickbooks",
  reportPeriod: { startDate: "2026-08-01", endDate: "2026-08-31" },
  normalizedBalanceSheet: [], normalizedIncomeStatement: [], normalizedTransactions: [], normalizedARAging: [], normalizedAPAging: [],
} as unknown as AdvisacorNormalizedFinancialData;

describe("RA Pro month-end orchestration", () => {
  it("selects the completed UTC month", () => {
    expect(priorUtcMonthEnd(new Date("2026-09-17T12:00:00Z"))).toBe("2026-08-31");
  });

  it.each(["quickbooks", "xero"] as const)("selects the prior month snapshot for %s even when a newer current-month snapshot exists", (provider) => {
    const prior = { ...payload, sourceSystem: provider, reportPeriod: { startDate: "2026-08-01", endDate: "2026-08-31" } };
    const current = { ...payload, sourceSystem: provider, reportPeriod: { startDate: "2026-09-01", endDate: "2026-09-01" } };
    const selected = selectLatestSyncByCompany([
      { id: "new", company_id: "company", source_system: provider, normalized_payload: current, last_synced_at: "2026-09-01T07:20:00Z", created_at: "2026-09-01T07:20:00Z" },
      { id: "month-end", company_id: "company", source_system: provider, normalized_payload: prior, last_synced_at: "2026-08-31T23:20:00Z", created_at: "2026-08-31T23:20:00Z" },
    ], "2026-08-31");
    expect(selected.get("company")?.id).toBe("month-end");
  });

  it("returns no candidate when the required month-end snapshot is missing", () => {
    const selected = selectLatestSyncByCompany([
      { id: "new", company_id: "company", source_system: "quickbooks", normalized_payload: { ...payload, reportPeriod: { startDate: "2026-09-01", endDate: "2026-09-01" } }, last_synced_at: "2026-09-01T07:20:00Z", created_at: "2026-09-01T07:20:00Z" },
    ], "2026-08-31");
    expect(selected.size).toBe(0);
  });

  it("persists an immutable review-only package", async () => {
    const persist = vi.fn();
    const result = await runRaProMonthEndReview({
      now: new Date("2026-09-17T12:00:00Z"),
      loadCandidates: async () => [{ firm_id: "f", firm_client_id: "fc", company_id: "c", accounting_sync_id: "s", provider: "quickbooks", synced_at: "2026-09-01T00:00:00Z", normalized_payload: payload }],
      loadFindings: async () => [], persist,
    });
    expect(result).toMatchObject({ status: "ok", period_end: "2026-08-31", completed: 1 });
    expect(persist).toHaveBeenCalledWith(expect.objectContaining({ period_end: "2026-08-31", review_package: expect.objectContaining({ review_only: true, provider_writes: false }) }));
  });

  it("fails closed when the latest successful snapshot is not month-end", async () => {
    const persist = vi.fn();
    const wrong = { ...payload, reportPeriod: { startDate: "2026-09-01", endDate: "2026-09-17" } };
    const result = await runRaProMonthEndReview({
      now: new Date("2026-09-17T12:00:00Z"),
      loadCandidates: async () => [{ firm_id: "f", firm_client_id: "fc", company_id: "c", accounting_sync_id: "s", provider: "quickbooks", synced_at: "2026-09-17T00:00:00Z", normalized_payload: wrong }],
      loadFindings: async () => [], persist,
    });
    expect(result).toMatchObject({ status: "partial", completed: 0, failed: 1 });
    expect(persist).not.toHaveBeenCalled();
  });
});
