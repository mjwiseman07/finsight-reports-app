import { describe, expect, it } from "vitest";
import { measureArTieOut } from "../ar-measure";
import type { QboArAgingResult, QboTrialBalanceResult } from "../qbo-reports";
import type { PolicySnapshot } from "../policy";

const policy: PolicySnapshot = {
  auto_reconcile_max_dollar: 1,
  auto_reconcile_max_percent: 0.01,
  kickout_min_dollar: 50,
  kickout_min_percent: 0.05,
  authoritative_comparison: "tighter_of_both",
};

const aging: QboArAgingResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  customers: [
    { customer_ref: "1", customer_display_name: "Acme", total_cents: 10_000 },
    { customer_ref: "2", customer_display_name: "Credit Co", total_cents: -400 },
  ],
  total_cents: 9_600,
  raw_report_url: "https://example.invalid/ar",
  intuit_tid: "tid-a",
};

const trial: QboTrialBalanceResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  lines: [
    {
      account_ref: "84",
      account_name: "Accounts Receivable",
      debit_cents: 9_000,
      credit_cents: 0,
      net_cents: 9_000,
    },
  ],
  raw_report_url: "https://example.invalid/tb",
  intuit_tid: "tid-b",
};

describe("measureArTieOut (locked formulas)", () => {
  it("22. subledger − GL net, credit-balance review, variance_cents 0", () => {
    const measured = measureArTieOut({
      aging,
      trialBalance: trial,
      arAccountId: "84",
      policy,
    });
    expect(measured.subTotalCents).toBe(9_600);
    expect(measured.glTotalCents).toBe(9_000);
    expect(measured.totalsVariance).toBe(600);
    expect(measured.customerRows[1]?.status).toBe("review");
    expect(measured.customerRows[1]?.variance_cents).toBe(0);
    expect(measured.customerRows[1]?.classification_reason).toContain(
      "credit-balance customer on AR aging",
    );
    expect(measured.customerRows[0]?.status).toBe("tie");
  });

  it("identical values always produce the same totals", () => {
    const a = measureArTieOut({
      aging,
      trialBalance: trial,
      arAccountId: "84",
      policy,
    });
    const b = measureArTieOut({
      aging,
      trialBalance: trial,
      arAccountId: "84",
      policy,
    });
    expect(a.totalsVariance).toBe(b.totalsVariance);
    expect(a.totalsStatus).toBe(b.totalsStatus);
  });
});
