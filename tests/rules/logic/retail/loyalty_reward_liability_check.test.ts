import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  reportBalanceSheet: vi.fn(),
  qboQuery: vi.fn().mockResolvedValue({}),
  extractQueryEntities: vi.fn().mockReturnValue([]),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { reportBalanceSheet } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/retail/loyalty_reward_liability_check";
import { rtlCtx, plReport, plRow, acctRecord, memRecord } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const bsMock = vi.mocked(reportBalanceSheet as (...a: unknown[]) => Promise<unknown>);

const LOYALTY_ACCTS = () => acctRecord([{ account_id: "l1", account_name: "Loyalty Liability" }]);

describe("rtl.loyalty_reward_liability_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when drawdown is off expected redemption", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "rtl.loyalty_liability_accounts") return [LOYALTY_ACCTS()];
      if (memoryType === "rtl.loyalty_redemption_rate") return [memRecord({ redemption_pct_median: 0.2 })];
      return [];
    });
    bsMock
      .mockResolvedValueOnce(plReport([plRow("Loyalty Liability", 10000)]))
      .mockResolvedValueOnce(plReport([plRow("Loyalty Liability", 10000)]));
    const res = await evaluate(rtlCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("loyalty_drawdown_off_expected");
  });

  it("suppresses insufficient_memory_evidence when redemption rate absent", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "rtl.loyalty_liability_accounts") return [LOYALTY_ACCTS()];
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
