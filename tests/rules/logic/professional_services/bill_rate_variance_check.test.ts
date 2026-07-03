import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  qboQuery: vi.fn().mockResolvedValue({}),
  extractQueryEntities: vi.fn().mockReturnValue([]),
  findJournalEntries: vi.fn().mockResolvedValue([]),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { evaluate } from "@/lib/rules/logic/professional_services/bill_rate_variance_check";
import { psCtx, memRecord } from "./_ctx";

const memMock = vi.mocked(queryMemory);

describe("ps.bill_rate_variance_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when a role's actual bill rate exceeds tolerance", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "ps.standard_bill_rates") {
        return [memRecord({ rates: [{ role_or_class_id: "c1", role_name: "Senior", standard_rate_per_hour: 200 }] })];
      }
      if (memoryType === "ps.class_tracking_enabled") return [memRecord({ enabled: true })];
      return [];
    });
    // actual = 30000/100 = 300/hr vs standard 200 -> 50% variance > 15%
    const res = await evaluate(psCtx({ inputs: { periodEndDate: "2026-06-30", classActuals: [{ class_id: "c1", revenue: 30000, hours: 100 }] } }));
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("bill_rate_variance");
  });

  it("suppresses no_standard_rate_policy when rate memory absent", async () => {
    memMock.mockResolvedValue([]);
    const res = await evaluate(psCtx());
    expect(res.reason_code).toBe("no_standard_rate_policy");
  });

  it("suppresses qbo_unavailable when ctx.qbo is null", async () => {
    const res = await evaluate(psCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
