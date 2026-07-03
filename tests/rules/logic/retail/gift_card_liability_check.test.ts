import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  reportBalanceSheet: vi.fn(),
  qboQuery: vi.fn().mockResolvedValue({}),
  extractQueryEntities: vi.fn().mockReturnValue([]),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { reportBalanceSheet } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/retail/gift_card_liability_check";
import { rtlCtx, plReport, plRow, acctRecord, memRecord } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const bsMock = vi.mocked(reportBalanceSheet as (...a: unknown[]) => Promise<unknown>);

const GC_ACCTS = () => acctRecord([{ account_id: "g1", account_name: "Gift Card Liability" }]);

describe("rtl.gift_card_liability_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when breakage recognition is out of band", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "rtl.gift_card_liability_accounts") return [GC_ACCTS()];
      if (memoryType === "rtl.gift_card_breakage_rate") return [memRecord({ annual_breakage_pct: 0.1 })];
      return [];
    });
    bsMock
      .mockResolvedValueOnce(plReport([plRow("Gift Card Liability", 10000)]))
      .mockResolvedValueOnce(plReport([plRow("Gift Card Liability", 10000)]));
    const res = await evaluate(rtlCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("gift_card_breakage_out_of_band");
  });

  it("suppresses insufficient_memory_evidence when breakage rate absent", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "rtl.gift_card_liability_accounts") return [GC_ACCTS()];
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
