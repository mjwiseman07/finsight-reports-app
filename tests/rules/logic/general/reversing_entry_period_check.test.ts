import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/qbo-rest", () => ({ findJournalEntries: vi.fn() }));

import { findJournalEntries } from "@/lib/qbo-rest";
import { evaluate } from "@/lib/rules/logic/general/reversing_entry_period_check";
import type { RuleContext } from "@/lib/rules/vertical-types";

const jeMock = vi.mocked(findJournalEntries as (...a: unknown[]) => Promise<unknown[]>);

// Mid-month periodEnd keeps firstDayOfMonth() stable regardless of test TZ.
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
    inputs: { periodEndDate: "2026-07-20" },
    inputsHash: "h",
    qbo,
  };
}

function reversal(id: string, txnDate: string) {
  return { Id: id, TxnDate: txnDate, DocNumber: `REV-${id}`, PrivateNote: "reversing accrual" };
}

describe("gen.reversing_entry_period_check", () => {
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

  it("suppresses all_reversals_correctly_dated when reversals post to first of month", async () => {
    jeMock.mockResolvedValue([reversal("1", "2026-07-01"), reversal("2", "2026-07-01")]);
    const res = await evaluate(ctx());
    expect(res.outcome).toBe("suppressed");
    expect(res.reason_code).toBe("all_reversals_correctly_dated");
  });

  it("fires reversal_wrong_period with expected first-of-month date", async () => {
    jeMock.mockResolvedValue([reversal("1", "2026-07-15")]);
    const res = await evaluate(ctx());
    expect(res.fired).toBe(true);
    expect(res.reason_code).toBe("reversal_wrong_period");
    expect(res.reason_detail.expected).toBe("2026-07-01");
  });
});
