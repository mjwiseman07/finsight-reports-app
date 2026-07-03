import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({ reportProfitAndLoss: vi.fn() }));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { reportProfitAndLoss } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/manufacturing/warranty_accrual_check";
import { mfgCtx, memRecord, plReport, plRow } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const plMock = vi.mocked(reportProfitAndLoss as (...a: unknown[]) => Promise<unknown>);

describe("mfg.warranty_accrual_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when warranty accrual is under-accruing vs baseline", async () => {
    memMock.mockResolvedValue([memRecord({ median_pct_of_revenue: 2, p90_pct: 3 })]);
    plMock.mockResolvedValue(
      plReport([
        plRow("Total Income", 10000),
        plRow("Warranty Expense", 5),
      ]),
    );
    const res = await evaluate(mfgCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("warranty_accrual_out_of_band");
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
