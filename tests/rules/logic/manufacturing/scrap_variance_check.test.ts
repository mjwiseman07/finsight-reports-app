import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({ reportProfitAndLoss: vi.fn() }));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { reportProfitAndLoss } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/manufacturing/scrap_variance_check";
import { mfgCtx, memRecord, plReport, plRow } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const plMock = vi.mocked(reportProfitAndLoss as (...a: unknown[]) => Promise<unknown>);

describe("mfg.scrap_variance_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when scrap pct exceeds p90 baseline", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "mfg.scrap_pct_baseline") {
        return [memRecord({ p90_pct: 2, median_pct: 1 })];
      }
      return [memRecord({ account_labels: ["scrap expense"] })];
    });
    plMock.mockResolvedValue(
      plReport([
        plRow("Total Income", 10000),
        plRow("Scrap Expense", 500),
      ]),
    );
    const res = await evaluate(mfgCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("scrap_pct_above_p90");
  });

  it("suppresses when memory baseline is absent", async () => {
    memMock.mockResolvedValue([]);
    const res = await evaluate(mfgCtx());
    expect(res.reason_code).toBe("insufficient_memory_evidence");
  });

  it("suppresses when ctx.qbo is null", async () => {
    const res = await evaluate(mfgCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
