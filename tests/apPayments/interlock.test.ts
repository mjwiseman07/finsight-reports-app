import { describe, expect, it } from "vitest";
import { computeInterlock } from "@/lib/ap-intake/payments/interlock";

const PERIOD = { period_year: 2026, period_month: 7 };

describe("computeInterlock", () => {
  it("passes with no lines", () => {
    const d = computeInterlock({ lines: [], vendor_commitments: [], gl_budgets: [] });
    expect(d.passed).toBe(true);
    expect(d.per_vendor).toEqual([]);
    expect(d.gl_budget_snapshot).toEqual([]);
    expect(d.reason_codes).toEqual([]);
  });

  it("single vendor passes when net within requisition remaining", () => {
    const d = computeInterlock({
      lines: [
        {
          vendor_id: "v1",
          gross_amount_cents: 10000,
          applied_credit_cents: 0,
          applied_prepayment_cents: 0,
          net_amount_cents: 10000,
          gl_account_code: null,
          ...PERIOD,
        },
      ],
      vendor_commitments: [
        { vendor_id: "v1", requisition_remaining_cents: 20000, annual_commitment_remaining_cents: null },
      ],
      gl_budgets: [],
    });
    expect(d.passed).toBe(true);
    expect(d.per_vendor[0]?.passes).toBe(true);
  });

  it("single vendor fails when net exceeds requisition remaining", () => {
    const d = computeInterlock({
      lines: [
        {
          vendor_id: "v1",
          gross_amount_cents: 50000,
          applied_credit_cents: 0,
          applied_prepayment_cents: 0,
          net_amount_cents: 50000,
          gl_account_code: null,
          ...PERIOD,
        },
      ],
      vendor_commitments: [
        { vendor_id: "v1", requisition_remaining_cents: 10000, annual_commitment_remaining_cents: null },
      ],
      gl_budgets: [],
    });
    expect(d.passed).toBe(false);
    expect(d.per_vendor[0]?.reason_codes).toContain("requisition_remaining_exceeded");
  });

  it("single vendor fails when net exceeds annual commitment", () => {
    const d = computeInterlock({
      lines: [
        {
          vendor_id: "v1",
          gross_amount_cents: 30000,
          applied_credit_cents: 0,
          applied_prepayment_cents: 0,
          net_amount_cents: 30000,
          gl_account_code: null,
          ...PERIOD,
        },
      ],
      vendor_commitments: [
        { vendor_id: "v1", requisition_remaining_cents: null, annual_commitment_remaining_cents: 20000 },
      ],
      gl_budgets: [],
    });
    expect(d.passed).toBe(false);
    expect(d.per_vendor[0]?.reason_codes).toContain("annual_commitment_exceeded");
  });

  it("multi-vendor mixed pass/fail aggregates correctly", () => {
    const d = computeInterlock({
      lines: [
        {
          vendor_id: "v1",
          gross_amount_cents: 5000,
          applied_credit_cents: 0,
          applied_prepayment_cents: 0,
          net_amount_cents: 5000,
          gl_account_code: null,
          ...PERIOD,
        },
        {
          vendor_id: "v2",
          gross_amount_cents: 90000,
          applied_credit_cents: 0,
          applied_prepayment_cents: 0,
          net_amount_cents: 90000,
          gl_account_code: null,
          ...PERIOD,
        },
      ],
      vendor_commitments: [
        { vendor_id: "v1", requisition_remaining_cents: 10000, annual_commitment_remaining_cents: null },
        { vendor_id: "v2", requisition_remaining_cents: 50000, annual_commitment_remaining_cents: null },
      ],
      gl_budgets: [],
    });
    expect(d.passed).toBe(false);
    expect(d.per_vendor.find((p) => p.vendor_id === "v1")?.passes).toBe(true);
    expect(d.per_vendor.find((p) => p.vendor_id === "v2")?.passes).toBe(false);
  });

  it("gl budget passes when in-batch within tolerance-adjusted remaining", () => {
    const d = computeInterlock({
      lines: [
        {
          vendor_id: "v1",
          gross_amount_cents: 10000,
          applied_credit_cents: 0,
          applied_prepayment_cents: 0,
          net_amount_cents: 10000,
          gl_account_code: "6100",
          ...PERIOD,
        },
      ],
      vendor_commitments: [],
      gl_budgets: [
        {
          gl_account_code: "6100",
          period_year: 2026,
          period_month: 7,
          budget_amount_cents: 10000,
          tolerance_pct: 10,
          already_committed_cents: 0,
        },
      ],
    });
    expect(d.passed).toBe(true);
    expect(d.gl_budget_snapshot[0]?.passes).toBe(true);
  });

  it("gl budget fails when in-batch exceeds tolerance-adjusted remaining", () => {
    const d = computeInterlock({
      lines: [
        {
          vendor_id: "v1",
          gross_amount_cents: 12000,
          applied_credit_cents: 0,
          applied_prepayment_cents: 0,
          net_amount_cents: 12000,
          gl_account_code: "6100",
          ...PERIOD,
        },
      ],
      vendor_commitments: [],
      gl_budgets: [
        {
          gl_account_code: "6100",
          period_year: 2026,
          period_month: 7,
          budget_amount_cents: 10000,
          tolerance_pct: 10,
          already_committed_cents: 0,
        },
      ],
    });
    expect(d.passed).toBe(false);
    expect(d.gl_budget_snapshot[0]?.passes).toBe(false);
    expect(d.reason_codes.some((c) => c.startsWith("gl_budget_exceeded:"))).toBe(true);
  });

  it("missing gl budget row passes (unconstrained account)", () => {
    const d = computeInterlock({
      lines: [
        {
          vendor_id: "v1",
          gross_amount_cents: 999999,
          applied_credit_cents: 0,
          applied_prepayment_cents: 0,
          net_amount_cents: 999999,
          gl_account_code: "9999",
          ...PERIOD,
        },
      ],
      vendor_commitments: [],
      gl_budgets: [],
    });
    expect(d.passed).toBe(true);
    expect(d.gl_budget_snapshot[0]?.passes).toBe(true);
    expect(d.gl_budget_snapshot[0]?.budget_cents).toBe(0);
  });
});
