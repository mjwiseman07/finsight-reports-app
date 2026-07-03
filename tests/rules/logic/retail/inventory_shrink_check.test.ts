import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  reportProfitAndLoss: vi.fn(),
  qboQuery: vi.fn().mockResolvedValue({}),
  extractQueryEntities: vi.fn().mockReturnValue([]),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { reportProfitAndLoss } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/retail/inventory_shrink_check";
import { rtlCtx, plReport, plRow, acctRecord, memRecord } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const plMock = vi.mocked(reportProfitAndLoss as (...a: unknown[]) => Promise<unknown>);

const SHRINK_ACCTS = () => acctRecord([{ account_id: "s1", account_name: "Inventory Shrink" }]);

describe("rtl.inventory_shrink_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when shrink pct exceeds p90 baseline", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "rtl.shrink_accounts") return [SHRINK_ACCTS()];
      if (memoryType === "rtl.shrink_baseline") return [memRecord({ shrink_pct_of_sales_p90: 1 })];
      return [];
    });
    plMock.mockResolvedValue(
      plReport([plRow("Total Income", 10000), plRow("Inventory Shrink", 500)]),
    );
    const res = await evaluate(rtlCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("shrink_above_p90");
  });

  it("suppresses insufficient_memory_evidence when baseline absent", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "rtl.shrink_accounts") return [SHRINK_ACCTS()];
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
