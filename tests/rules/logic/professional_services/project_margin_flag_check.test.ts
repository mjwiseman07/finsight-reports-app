import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  qboQuery: vi.fn().mockResolvedValue({}),
  extractQueryEntities: vi.fn().mockReturnValue([]),
  findJournalEntries: vi.fn().mockResolvedValue([]),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { evaluate } from "@/lib/rules/logic/professional_services/project_margin_flag_check";
import { psCtx, memRecord } from "./_ctx";

const memMock = vi.mocked(queryMemory);

describe("ps.project_margin_flag_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when a project margin is below the p10 baseline", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "ps.class_tracking_enabled") return [memRecord({ enabled: true })];
      if (memoryType === "ps.project_margin_baseline") return [memRecord({ margin_pct_p10: 20 })];
      return [];
    });
    // margin = (10000-9500)/10000 = 5% < 20% p10 -> fire
    const res = await evaluate(
      psCtx({ inputs: { periodEndDate: "2026-06-30", classMargins: [{ class_id: "p1", class_name: "Proj1", revenue: 10000, direct_cost: 9500 }] } }),
    );
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("project_margin_below_band");
  });

  it("suppresses insufficient_memory_evidence when baseline absent", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "ps.class_tracking_enabled") return [memRecord({ enabled: true })];
      return [];
    });
    const res = await evaluate(psCtx());
    expect(res.reason_code).toBe("insufficient_memory_evidence");
  });

  it("suppresses qbo_unavailable when ctx.qbo is null", async () => {
    const res = await evaluate(psCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
