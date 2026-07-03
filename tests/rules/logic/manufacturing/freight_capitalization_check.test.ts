import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({ findJournalEntries: vi.fn() }));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { findJournalEntries } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/manufacturing/freight_capitalization_check";
import { mfgCtx, memRecord } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const jeMock = vi.mocked(findJournalEntries as (...a: unknown[]) => Promise<unknown[]>);

describe("mfg.freight_capitalization_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when freight expense JEs exceed policy threshold", async () => {
    memMock.mockResolvedValue([memRecord({ threshold_amount: 100 })]);
    jeMock.mockResolvedValue([
      {
        Id: "je-1",
        Line: [
          {
            Amount: 500,
            Description: "Inbound freight",
            JournalEntryLineDetail: {
              AccountRef: { name: "Freight Expense" },
            },
          },
        ],
      },
    ]);
    const res = await evaluate(mfgCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("freight_expensed_not_capitalized");
  });

  it("suppresses when freight policy memory is absent", async () => {
    memMock.mockResolvedValue([]);
    const res = await evaluate(mfgCtx());
    expect(res.reason_code).toBe("no_freight_capitalization_policy");
  });

  it("suppresses when ctx.qbo is null", async () => {
    memMock.mockResolvedValue([memRecord({ threshold_amount: 100 })]);
    const res = await evaluate(mfgCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
