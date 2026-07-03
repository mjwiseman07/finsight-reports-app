import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  qboQuery: vi.fn().mockResolvedValue({}),
  extractQueryEntities: vi.fn().mockReturnValue([]),
  findJournalEntries: vi.fn(),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { findJournalEntries } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/professional_services/unbilled_receivables_check";
import { psCtx, acctRecord, je } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const jeMock = vi.mocked(findJournalEntries as (...a: unknown[]) => Promise<unknown>);

describe("ps.unbilled_receivables_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires (escalated) when oldest WIP exceeds critical aging band", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "ps.wip_accounts") {
        return [acctRecord([{ account_id: "wip1", account_name: "WIP" }])];
      }
      return [];
    });
    // period end 2026-06-30; debit 2026-01-01 (~180d) with no billings -> over critical 90
    jeMock.mockResolvedValue([je("2026-01-01", "WIP", 8000, "Debit")]);
    const res = await evaluate(psCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("unbilled_wip_over_critical");
    expect(res.severity_override).toBe("error");
  });

  it("suppresses no_wip_accounts when memory + QBO fallback both empty", async () => {
    memMock.mockResolvedValue([]);
    const res = await evaluate(psCtx());
    expect(res.reason_code).toBe("no_wip_accounts");
  });

  it("suppresses qbo_unavailable when ctx.qbo is null", async () => {
    const res = await evaluate(psCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
