import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({ reportBalanceSheet: vi.fn() }));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { reportBalanceSheet } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/manufacturing/wip_cutoff_check";
import { mfgCtx, memRecord, plReport, plRow } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const bsMock = vi.mocked(reportBalanceSheet as (...a: unknown[]) => Promise<unknown>);

describe("mfg.wip_cutoff_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when WIP balance is outside expected band", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "mfg.wip_expected_band") {
        return [memRecord({ low: 1000, high: 5000 })];
      }
      return [memRecord({ account_labels: ["WIP"] })];
    });
    bsMock.mockResolvedValue(plReport([plRow("WIP Inventory", 9000)]));
    const res = await evaluate(mfgCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("wip_outside_expected_band");
  });

  it("suppresses when memory band is absent", async () => {
    memMock.mockResolvedValue([]);
    const res = await evaluate(mfgCtx());
    expect(res.reason_code).toBe("insufficient_memory_evidence");
  });

  it("suppresses when ctx.qbo is null", async () => {
    const res = await evaluate(mfgCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
