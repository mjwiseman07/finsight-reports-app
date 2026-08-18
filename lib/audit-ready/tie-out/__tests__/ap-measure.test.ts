import { describe, expect, it } from "vitest";
import { measureApTieOut } from "../ap-measure";
import type { QboApAgingResult, QboTrialBalanceResult } from "../qbo-reports";
import type { PolicySnapshot } from "../policy";

const policy: PolicySnapshot = {
  auto_reconcile_max_dollar: 1,
  auto_reconcile_max_percent: 0.01,
  kickout_min_dollar: 50,
  kickout_min_percent: 0.05,
  authoritative_comparison: "tighter_of_both",
};

const aging: QboApAgingResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  vendors: [
    { vendor_ref: "1", vendor_display_name: "Vendor A", total_cents: 8_000 },
    { vendor_ref: "2", vendor_display_name: "Debit Vendor", total_cents: -300 },
  ],
  total_cents: 7_700,
  raw_report_url: "https://example.invalid/ap",
  intuit_tid: "tid-ap",
};

const trial: QboTrialBalanceResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  lines: [
    {
      account_ref: "33",
      account_name: "Accounts Payable",
      debit_cents: 0,
      credit_cents: 7_000,
      net_cents: -7_000,
    },
  ],
  raw_report_url: "https://example.invalid/tb",
  intuit_tid: "tid-tb",
};

describe("measureApTieOut (locked formulas)", () => {
  it("26-29. subledger − |GL|, Math.abs, vendor debit review, variance_cents 0", () => {
    const measured = measureApTieOut({
      aging,
      trialBalance: trial,
      apAccountId: "33",
      policy,
    });
    expect(measured.subTotalCents).toBe(7_700);
    expect(measured.glNetCents).toBe(-7_000);
    expect(measured.glTotalCents).toBe(7_000);
    expect(measured.totalsVariance).toBe(700);
    expect(measured.vendorRows[1]?.status).toBe("review");
    expect(measured.vendorRows[1]?.variance_cents).toBe(0);
    expect(measured.vendorRows[1]?.classification_reason).toBe(
      "vendor_debit_balance_review",
    );
    expect(measured.vendorRows[0]?.status).toBe("tie");
  });

  it("identical values always produce the same totals", () => {
    const a = measureApTieOut({
      aging,
      trialBalance: trial,
      apAccountId: "33",
      policy,
    });
    const b = measureApTieOut({
      aging,
      trialBalance: trial,
      apAccountId: "33",
      policy,
    });
    expect(a.totalsVariance).toBe(b.totalsVariance);
    expect(a.totalsStatus).toBe(b.totalsStatus);
  });
});
