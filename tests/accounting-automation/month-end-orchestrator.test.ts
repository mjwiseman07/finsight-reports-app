import { describe, expect, it, vi } from "vitest";
import type { AdvisacorNormalizedFinancialData } from "@/lib/integrations/accounting/types";
import { priorUtcMonthEnd, runRaProMonthEndReview } from "@/lib/accounting-automation/month-end-orchestrator";

const payload = {
  sourceSystem: "quickbooks",
  reportPeriod: { startDate: "2026-08-01", endDate: "2026-08-31" },
  normalizedBalanceSheet: [], normalizedIncomeStatement: [], normalizedTransactions: [], normalizedARAging: [], normalizedAPAging: [],
} as unknown as AdvisacorNormalizedFinancialData;

describe("RA Pro month-end orchestration", () => {
  it("selects the completed UTC month", () => {
    expect(priorUtcMonthEnd(new Date("2026-09-17T12:00:00Z"))).toBe("2026-08-31");
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
