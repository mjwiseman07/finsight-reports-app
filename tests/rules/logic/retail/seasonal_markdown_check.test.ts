import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  reportProfitAndLoss: vi.fn(),
  qboQuery: vi.fn().mockResolvedValue({}),
  extractQueryEntities: vi.fn().mockReturnValue([]),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { reportProfitAndLoss } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/retail/seasonal_markdown_check";
import { rtlCtx, plReport, plRow, acctRecord, memRecord } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const plMock = vi.mocked(reportProfitAndLoss as (...a: unknown[]) => Promise<unknown>);

const MARKDOWN_ACCTS = () => acctRecord([{ account_id: "m1", account_name: "Markdown" }]);

describe("rtl.seasonal_markdown_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when markdown pct is outside the month's seasonal band", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "rtl.markdown_accounts") return [MARKDOWN_ACCTS()];
      if (memoryType === "rtl.seasonal_markdown_baseline") {
        return [memRecord({ markdown_pct_by_month: { "6": 2 } })];
      }
      return [];
    });
    // period end 2026-06-30 -> month 6, expected 2%; actual 5% > 3% -> fire
    plMock.mockResolvedValue(plReport([plRow("Total Income", 10000), plRow("Markdown", 500)]));
    const res = await evaluate(rtlCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("markdown_outside_seasonal_band");
  });

  it("suppresses insufficient_memory_evidence when baseline absent", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "rtl.markdown_accounts") return [MARKDOWN_ACCTS()];
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
