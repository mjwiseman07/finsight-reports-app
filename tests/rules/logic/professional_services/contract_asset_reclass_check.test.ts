import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/memory/client-memory-service", () => ({ queryMemory: vi.fn() }));
vi.mock("@/lib/qbo-rest", () => ({
  qboQuery: vi.fn().mockResolvedValue({}),
  extractQueryEntities: vi.fn().mockReturnValue([]),
  findJournalEntries: vi.fn(),
}));

import { queryMemory } from "@/lib/memory/client-memory-service";
import { findJournalEntries } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/professional_services/contract_asset_reclass_check";
import { psCtx, acctRecord, je } from "./_ctx";

const memMock = vi.mocked(queryMemory);
const jeMock = vi.mocked(findJournalEntries as (...a: unknown[]) => Promise<unknown>);

describe("ps.contract_asset_reclass_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fires when contract asset has aged (>90d) unreclassed balance", async () => {
    memMock.mockImplementation(async ({ memoryType }) => {
      if (memoryType === "ps.contract_asset_accounts") {
        return [acctRecord([{ account_id: "ca1", account_name: "Contract Asset" }])];
      }
      return [];
    });
    // period end 2026-06-30; debit on 2026-01-01 (~180d old), no credits -> aged
    jeMock.mockResolvedValue([je("2026-01-01", "Contract Asset", 5000, "Debit")]);
    const res = await evaluate(psCtx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("contract_asset_aged");
  });

  it("suppresses no_contract_asset_account when memory absent (no fallback)", async () => {
    memMock.mockResolvedValue([]);
    const res = await evaluate(psCtx());
    expect(res.reason_code).toBe("no_contract_asset_account");
  });

  it("suppresses qbo_unavailable when ctx.qbo is null", async () => {
    const res = await evaluate(psCtx({ qbo: null }));
    expect(res.reason_code).toBe("qbo_unavailable");
  });
});
