import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  reportBalanceSheet: vi.fn(),
  reportProfitAndLoss: vi.fn(),
  qboQuery: vi.fn().mockResolvedValue({}),
  extractQueryEntities: vi.fn().mockReturnValue([]),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { reportBalanceSheet, reportProfitAndLoss } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/retail/sales_returns_reserve_check";
import { rtlCtx, plReport, plRow, acctRecord, memRecord } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const bsMock = vi.mocked(reportBalanceSheet as (...a: unknown[]) => Promise<unknown>);
const plMock = vi.mocked(reportProfitAndLoss as (...a: unknown[]) => Promise<unknown>);

const REFUND_ACCTS = () => acctRecord([{ account_id: "rf1", account_name: "Refund Liability" }]);

describe("rtl.sales_returns_reserve_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires under_reserved when reserve is far below expected", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "rtl.returns_reserve_accounts") return [REFUND_ACCTS()];
      if (memoryType === "rtl.returns_rate_baseline") {
        return [memRecord({ returns_pct_of_revenue_median: 0.1 })];
      }
      return [];
    });
    bsMock.mockResolvedValue(plReport([plRow("Refund Liability", 100)]));
    plMock.mockResolvedValue(plReport([plRow("Total Income", 30000)]));
    const res = await evaluate(rtlCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("returns_reserve_under_reserved");
  });

  it("suppresses insufficient_memory_evidence when baseline absent", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "rtl.returns_reserve_accounts") return [REFUND_ACCTS()];
      return [];
    });
    const res = await evaluate(rtlCtx());
    expect(res.reason_code).toBe("insufficient_memory_evidence");
  });

  it("suppresses qbo_unavailable when ctx.qbo is null", async () => {
    const res = await evaluate(rtlCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
