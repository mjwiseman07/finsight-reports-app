import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({ findJournalEntries: vi.fn() }));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { findJournalEntries } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/manufacturing/standard_cost_capitalization_check";
import { mfgCtx, memRecord } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const jeMock = vi.mocked(findJournalEntries as (...a: unknown[]) => Promise<unknown[]>);

describe("mfg.standard_cost_capitalization_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when revaluation is overdue and no revaluation JE is found", async () => {
    memMock.mockResolvedValue([
      memRecord({
        revaluation_frequency_months: 12,
        last_revaluation_period: "2024-01-01",
      }),
    ]);
    jeMock.mockResolvedValue([]);
    const res = await evaluate(mfgCtx({ inputs: { periodEndDate: "2026-06-30" } }));
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("missing_standard_cost_revaluation");
  });

  it("suppresses when standard cost policy memory is absent", async () => {
    memMock.mockResolvedValue([]);
    const res = await evaluate(mfgCtx());
    expect(res.reason_code).toBe("no_standard_cost_policy");
  });

  it("suppresses when ctx.qbo is null", async () => {
    memMock.mockResolvedValue([
      memRecord({ revaluation_frequency_months: 12, last_revaluation_period: "2024-01-01" }),
    ]);
    const res = await evaluate(mfgCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
