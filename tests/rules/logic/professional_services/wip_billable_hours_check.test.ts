import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  qboQuery: vi.fn().mockResolvedValue({}),
  extractQueryEntities: vi.fn().mockReturnValue([]),
  findJournalEntries: vi.fn(),
  reportBalanceSheet: vi.fn(),
  reportProfitAndLoss: vi.fn(),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { findJournalEntries, reportBalanceSheet, reportProfitAndLoss } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/professional_services/wip_billable_hours_check";
import { psCtx, acctRecord, je, plReport, plRow } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const jeMock = vi.mocked(findJournalEntries as (...a: unknown[]) => Promise<unknown>);
const bsMock = vi.mocked(reportBalanceSheet as (...a: unknown[]) => Promise<unknown>);
const plMock = vi.mocked(reportProfitAndLoss as (...a: unknown[]) => Promise<unknown>);

describe("ps.wip_billable_hours_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires wip_reconciliation_drift when balance change != JE net activity", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "ps.wip_accounts") {
        return [acctRecord([{ account_id: "wip1", account_name: "WIP" }])];
      }
      return [];
    });
    // end WIP 20000, prior 10000 -> balance change 10000; JE net = 3000 debit -> drift 7000
    bsMock
      .mockResolvedValueOnce(plReport([plRow("WIP", 20000)]))
      .mockResolvedValueOnce(plReport([plRow("WIP", 10000)]));
    plMock
      .mockResolvedValueOnce(plReport([plRow("Total Income", 50000)]))
      .mockResolvedValueOnce(plReport([plRow("Total Income", 50000)]));
    jeMock.mockResolvedValue([je("2026-06-15", "WIP", 3000, "Debit")]);
    const res = await evaluate(psCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("wip_reconciliation_drift");
  });

  it("suppresses no_wip_accounts when memory + QBO fallback both empty", async () => {
    memMock.mockResolvedValue([]);
    const res = await evaluate(psCtx());
    expect(res.reason_code).toBe("no_wip_accounts");
  });

  it("suppresses qbo_unavailable when ctx.qbo is null", async () => {
    const res = await evaluate(psCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
