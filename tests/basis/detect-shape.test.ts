/**
 * D6.4c-1 — Accrual-line shape detection. Pure function; no mocks.
 */
import { describe, expect, it } from "vitest";
import { detectAccrualLine } from "@/lib/pre-close/detect-shape";
import type { JEDraft } from "@/lib/pre-close/types";

function draft(lines: Partial<JEDraft["lines"][number]>[]): JEDraft {
  return {
    narration: "test",
    transactionDate: "2026-07-06",
    lines: lines.map((l, i) => ({
      lineIndex: i,
      accountId: `acct-${i}`,
      accountName: "Account",
      drAmountCents: 0,
      crAmountCents: 0,
      memo: "",
      ...l,
    })),
  };
}

describe("pre-close/detect-shape detectAccrualLine", () => {
  it("detects Accrued Payroll credit line -> true", () => {
    expect(
      detectAccrualLine(
        draft([
          { accountName: "Payroll Expense", drAmountCents: 5000 },
          { accountName: "Accrued Payroll", crAmountCents: 5000 },
        ]),
      ),
    ).toBe(true);
  });

  it("detects Contract Asset debit line -> true", () => {
    expect(
      detectAccrualLine(
        draft([
          { accountName: "Contract Asset", drAmountCents: 8000 },
          { accountName: "Revenue", crAmountCents: 8000 },
        ]),
      ),
    ).toBe(true);
  });

  it("ignores cash + expense pair -> false", () => {
    expect(
      detectAccrualLine(
        draft([
          { accountName: "Office Supplies Expense", drAmountCents: 1200 },
          { accountName: "Operating Cash", crAmountCents: 1200 },
        ]),
      ),
    ).toBe(false);
  });

  it("detects Deferred Revenue credit -> true", () => {
    expect(
      detectAccrualLine(
        draft([
          { accountName: "Cash", drAmountCents: 9000 },
          { accountName: "Deferred Revenue", crAmountCents: 9000 },
        ]),
      ),
    ).toBe(true);
  });
});
