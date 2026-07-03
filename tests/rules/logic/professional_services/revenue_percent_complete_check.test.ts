import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  qboQuery: vi.fn().mockResolvedValue({}),
  extractQueryEntities: vi.fn().mockReturnValue([]),
  findJournalEntries: vi.fn().mockResolvedValue([]),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { evaluate } from "@/lib/rules/logic/professional_services/revenue_percent_complete_check";
import { psCtx, memRecord } from "./_ctx";

const memMock = vi.mocked(queryMemory);

describe("ps.revenue_percent_complete_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when recognized revenue diverges from percent-complete expectation", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "ps.percent_complete_projects") {
        return [
          memRecord({
            projects: [
              {
                class_id: "p1",
                contract_value: 100000,
                cost_to_date: 50000,
                estimated_total_cost: 100000,
                revenue_recognized_to_date: 20000,
              },
            ],
          }),
        ];
      }
      return [];
    });
    // expected = 50% * 100000 = 50000 vs actual 20000; variance 30000 / 100000 = 30% > 5% -> fire
    const res = await evaluate(psCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("revenue_recognition_variance");
  });

  it("suppresses no_percent_complete_data when memory absent", async () => {
    memMock.mockResolvedValue([]);
    const res = await evaluate(psCtx());
    expect(res.reason_code).toBe("no_percent_complete_data");
  });

  it("suppresses qbo_unavailable when ctx.qbo is null", async () => {
    const res = await evaluate(psCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
