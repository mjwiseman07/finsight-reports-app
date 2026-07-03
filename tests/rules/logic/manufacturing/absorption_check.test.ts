import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({ reportProfitAndLoss: vi.fn() }));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { reportProfitAndLoss } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/manufacturing/absorption_check";
import { mfgCtx, memRecord, plReport, plRow } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const plMock = vi.mocked(reportProfitAndLoss as (...a: unknown[]) => Promise<unknown>);

describe("mfg.absorption_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when absorption ratio is outside tolerance band", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "mfg.absorption_ratio_baseline") {
        return [memRecord({ applied_to_actual_median: 1.0, tolerance_pct: 0.05 })];
      }
      if (memoryType === "mfg.absorption_account_map") {
        return [
          memRecord({
            applied_overhead_labels: ["applied overhead"],
            actual_overhead_labels: ["actual overhead"],
          }),
        ];
      }
      return [];
    });
    plMock.mockResolvedValue(
      plReport([
        plRow("Applied Overhead", 2000),
        plRow("Actual Overhead", 1000),
      ]),
    );
    const res = await evaluate(mfgCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("absorption_ratio_out_of_band");
  });

  it("suppresses when memory baseline is absent", async () => {
    memMock.mockResolvedValue([]);
    const res = await evaluate(mfgCtx());
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("insufficient_memory_evidence");
  });

  it("suppresses when ctx.qbo is null", async () => {
    const res = await evaluate(mfgCtx({ qbo: null }));
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
