import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/qbo-rest", () => ({ findJournalEntries: vi.fn() }));

import { findJournalEntries } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/general/accrual_reversal_check";
import type { RuleContext } from "@/lib/rules/vertical-types";

const jeMock = vi.mocked(findJournalEntries as (...a: unknown[]) => Promise<unknown[]>);

function ctx(
  accountingMethod: RuleContext["accountingMethod"] = "accrual",
  qbo: RuleContext["qbo"] = { accessToken: "t", realmId: "r" },
): RuleContext {
  return {
    firmClientId: "client-1",
    companyId: "co-1",
    industryVertical: "general",
    accountingMethod,
    targetType: "period",
    targetRef: "2026-07",
    inputs: { periodEndDate: "2026-07-31" },
    inputsHash: "h",
    qbo,
  };
}

function accrual(id: string, doc: string) {
  return { Id: id, TxnDate: "2026-06-15", DocNumber: doc, PrivateNote: "monthly accrual" };
}
function reversalRef(id: string, marker: string) {
  return { Id: id, TxnDate: "2026-07-01", DocNumber: `REV-${id}`, PrivateNote: `reversing ${marker}` };
}

describe("gen.accrual_reversal_check", () => {
  beforeEach(() => vi.clearAllMocks());

  it("suppresses on cash basis", async () => {
    const res = await evaluate(ctx("cash"));
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("not_applicable_cash_basis");
  });

  it("suppresses when qbo is null", async () => {
    const res = await evaluate(ctx("accrual", null));
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("qbo_unavailable");
  });

  it("suppresses all_accruals_reversed when every accrual has a matching reversal", async () => {
    jeMock
      .mockResolvedValueOnce([accrual("1", "ACC-1"), accrual("2", "ACC-2"), accrual("3", "ACC-3")])
      .mockResolvedValueOnce([reversalRef("10", "ACC-1"), reversalRef("11", "ACC-2"), reversalRef("12", "ACC-3")]);
    const res = await evaluate(ctx());
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("all_accruals_reversed");
  });

  it("fires missing_reversals with correct missing count", async () => {
    jeMock
      .mockResolvedValueOnce([accrual("1", "ACC-1"), accrual("2", "ACC-2"), accrual("3", "ACC-3")])
      .mockResolvedValueOnce([reversalRef("10", "ACC-1")]);
    const res = await evaluate(ctx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("missing_reversals");
    expect(res.reason_detail.missingCount).toBe(2);
  });

  it("suppresses no_prior_accruals when prior period has none", async () => {
    jeMock.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const res = await evaluate(ctx());
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("no_prior_accruals");
  });
});

describe("gen.accrual_reversal_check — D6.4c-2 proposedJE emission", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits a balanced reversing JE draft when an unmatched accrual is found", async () => {
    jeMock
      .mockResolvedValueOnce([
        {
          Id: "je-1",
          DocNumber: "ACC-001",
          TxnDate: "2026-05-31",
          PrivateNote: "accrual for June rent",
          Line: [
            { Amount: 100, JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: "6000", name: "Rent Expense" } } },
            { Amount: 100, JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: "2100", name: "Accrued Liabilities" } } },
          ],
        },
      ])
      .mockResolvedValueOnce([]);
    const result = await evaluate(ctx());
    expect(result.outcome).toBe("fired");
    const proposedJE = (result.reason_detail as { proposedJE?: unknown }).proposedJE;
    expect(proposedJE).toBeDefined();
    const lines = (proposedJE as { lines: Array<Record<string, number>> }).lines;
    expect(lines).toHaveLength(2);
    // Swapped: source debit became reversal credit and vice versa.
    expect(lines[0].drAmountCents).toBe(0);
    expect(lines[0].crAmountCents).toBe(10000);
    expect(lines[1].drAmountCents).toBe(10000);
    expect(lines[1].crAmountCents).toBe(0);
    const totalDr = lines.reduce((s, l) => s + l.drAmountCents, 0);
    const totalCr = lines.reduce((s, l) => s + l.crAmountCents, 0);
    expect(totalDr).toBe(totalCr);
  });

  it("does NOT emit proposedJE when source JE has malformed lines (missing AccountRef)", async () => {
    jeMock
      .mockResolvedValueOnce([
        {
          Id: "je-2",
          DocNumber: "ACC-002",
          TxnDate: "2026-05-31",
          PrivateNote: "accrual",
          Line: [
            { Amount: 50, JournalEntryLineDetail: { PostingType: "Debit" } },
            { Amount: 50, JournalEntryLineDetail: { PostingType: "Credit", AccountRef: { value: "2100", name: "AL" } } },
          ],
        },
      ])
      .mockResolvedValueOnce([]);
    const result = await evaluate(ctx());
    expect(result.outcome).toBe("fired");
    expect((result.reason_detail as { proposedJE?: unknown }).proposedJE).toBeUndefined();
  });

  it("still fires but does not emit proposedJE when source JE has fewer than 2 lines", async () => {
    jeMock
      .mockResolvedValueOnce([
        {
          Id: "je-3",
          DocNumber: "ACC-003",
          TxnDate: "2026-05-31",
          PrivateNote: "accrual",
          Line: [
            { Amount: 50, JournalEntryLineDetail: { PostingType: "Debit", AccountRef: { value: "6000", name: "Rent" } } },
          ],
        },
      ])
      .mockResolvedValueOnce([]);
    const result = await evaluate(ctx());
    expect(result.outcome).toBe("fired");
    expect((result.reason_detail as { proposedJE?: unknown }).proposedJE).toBeUndefined();
  });
});
