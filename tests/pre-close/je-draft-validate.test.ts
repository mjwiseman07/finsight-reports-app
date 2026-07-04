/**
 * D6.4c-1 — Pure JE draft validator tests.
 */
import { describe, expect, it } from "vitest";
import { validateJeDraft } from "@/lib/pre-close/je-draft-validate";
import type { JEDraft } from "@/lib/pre-close/types";

function line(over: Partial<JEDraft["lines"][number]>): JEDraft["lines"][number] {
  return {
    lineIndex: 0,
    accountId: "a",
    accountName: "Account A",
    drAmountCents: 0,
    crAmountCents: 0,
    memo: "",
    ...over,
  };
}

function draft(lines: JEDraft["lines"], over: Partial<JEDraft> = {}): JEDraft {
  return { narration: "n", transactionDate: "2026-07-06", lines, ...over };
}

describe("pre-close/je-draft-validate validateJeDraft", () => {
  it("balanced 2-line -> ok", () => {
    const r = validateJeDraft(
      draft([
        line({ accountId: "a", accountName: "A", drAmountCents: 500 }),
        line({ accountId: "b", accountName: "B", crAmountCents: 500 }),
      ]),
    );
    expect(r.ok).toBe(true);
    expect(r.totalDebitCents).toBe(500);
    expect(r.totalCreditCents).toBe(500);
    expect(r.lineCount).toBe(2);
  });

  it("unbalanced -> unbalanced", () => {
    const r = validateJeDraft(
      draft([
        line({ accountId: "a", accountName: "A", drAmountCents: 500 }),
        line({ accountId: "b", accountName: "B", crAmountCents: 400 }),
      ]),
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("unbalanced");
  });

  it("single line -> min_two_lines", () => {
    const r = validateJeDraft(draft([line({ accountName: "A", drAmountCents: 100 })]));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("min_two_lines");
  });

  it("line with both dr and cr -> line_has_both_dr_and_cr", () => {
    const r = validateJeDraft(
      draft([
        line({ accountName: "A", drAmountCents: 100, crAmountCents: 100 }),
        line({ accountName: "B", crAmountCents: 100 }),
      ]),
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("line_has_both_dr_and_cr");
  });

  it("line with zero amount -> line_has_zero_amount", () => {
    const r = validateJeDraft(
      draft([
        line({ accountName: "A", drAmountCents: 0, crAmountCents: 0 }),
        line({ accountName: "B", crAmountCents: 100 }),
      ]),
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("line_has_zero_amount");
  });

  it("missing narration -> missing_narration_or_date", () => {
    const r = validateJeDraft(
      draft(
        [
          line({ accountName: "A", drAmountCents: 500 }),
          line({ accountName: "B", crAmountCents: 500 }),
        ],
        { narration: "" },
      ),
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("missing_narration_or_date");
  });
});
