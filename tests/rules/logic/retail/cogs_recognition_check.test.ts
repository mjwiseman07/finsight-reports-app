import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  reportProfitAndLoss: vi.fn(),
  qboQuery: vi.fn().mockResolvedValue({}),
  extractQueryEntities: vi.fn().mockReturnValue([]),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { reportProfitAndLoss } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/retail/cogs_recognition_check";
import { rtlCtx, plReport, plRow, acctRecord } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const plMock = vi.mocked(reportProfitAndLoss as (...a: unknown[]) => Promise<unknown>);

describe("rtl.cogs_recognition_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when COGS ratio shifts >5pp and >$1000 vs prior period", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "rtl.cogs_accounts") {
        return [acctRecord([{ account_id: "c1", account_name: "Cost of Goods Sold" }])];
      }
      if (memoryType === "rtl.revenue_accounts") {
        return [acctRecord([{ account_id: "r1", account_name: "Sales" }])];
      }
      return [];
    });
    plMock
      .mockResolvedValueOnce(plReport([plRow("Sales", 10000), plRow("Cost of Goods Sold", 6000)]))
      .mockResolvedValueOnce(plReport([plRow("Sales", 10000), plRow("Cost of Goods Sold", 4000)]));
    const res = await evaluate(rtlCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("cogs_recognition_mismatch");
  });

  it("suppresses no_cogs_accounts when COGS accounts cannot be resolved", async () => {
    memMock.mockResolvedValue([]);
    const res = await evaluate(rtlCtx());
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("no_cogs_accounts");
  });

  it("suppresses qbo_unavailable when ctx.qbo is null", async () => {
    const res = await evaluate(rtlCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
