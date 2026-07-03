import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({ reportProfitAndLoss: vi.fn() }));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { reportProfitAndLoss } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/manufacturing/cogs_variance_check";
import { mfgCtx, memRecord, plReport, plRow } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const plMock = vi.mocked(reportProfitAndLoss as (...a: unknown[]) => Promise<unknown>);

describe("mfg.cogs_variance_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when COGS ratio is outside p10-p90 band", async () => {
    memMock.mockResolvedValue([memRecord({ p10_pct: 30, p90_pct: 40, median_pct: 35 })]);
    plMock.mockResolvedValue(
      plReport([plRow("Total Income", 10000), plRow("Cost of Goods Sold", 6000)]),
    );
    const res = await evaluate(mfgCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("cogs_ratio_out_of_band");
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
