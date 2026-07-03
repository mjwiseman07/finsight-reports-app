import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  reportBalanceSheet: vi.fn(),
  findJournalEntries: vi.fn(),
  qboQuery: vi.fn(),
  extractQueryEntities: vi.fn(),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { reportBalanceSheet, findJournalEntries } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/manufacturing/inventory_reconciliation_check";
import { mfgCtx, memRecord, plReport, plRow } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const bsMock = vi.mocked(reportBalanceSheet as (...a: unknown[]) => Promise<unknown>);
const jeMock = vi.mocked(findJournalEntries as (...a: unknown[]) => Promise<unknown[]>);

describe("mfg.inventory_reconciliation_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when inventory change does not tie to JE activity", async () => {
    memMock.mockResolvedValue([memRecord({ account_ids: ["inv-1"] })]);
    bsMock
      .mockResolvedValueOnce(plReport([plRow("Inventory", 11000)]))
      .mockResolvedValueOnce(plReport([plRow("Inventory", 10000)]));
    jeMock.mockResolvedValue([
      {
        Id: "je-1",
        Line: [{ Amount: 50, JournalEntryLineDetail: { AccountRef: { value: "inv-1" } } }],
      },
    ]);
    const res = await evaluate(mfgCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("inventory_reconciliation_variance");
  });

  it("suppresses when inventory accounts cannot be resolved", async () => {
    memMock.mockResolvedValue([]);
    const { qboQuery, extractQueryEntities } = await import("@/lib/qbo-rest");
    vi.mocked(qboQuery as (...a: unknown[]) => Promise<unknown>).mockResolvedValue({});
    vi.mocked(extractQueryEntities as (...a: unknown[]) => unknown[]).mockReturnValue([]);
    const res = await evaluate(mfgCtx());
    expect(res.reason_code).toBe("no_inventory_accounts");
  });

  it("suppresses when ctx.qbo is null", async () => {
    const res = await evaluate(mfgCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
