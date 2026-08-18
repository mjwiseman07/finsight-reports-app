import { describe, expect, it } from "vitest";
import { measureInventoryTieOut } from "../inventory-measure";
import type { QboInventoryValuationResult, QboTrialBalanceResult } from "../qbo-reports";
import type { PolicySnapshot } from "../policy";

const policy: PolicySnapshot = {
  auto_reconcile_max_dollar: 1,
  auto_reconcile_max_percent: 0.01,
  kickout_min_dollar: 50,
  kickout_min_percent: 0.05,
  authoritative_comparison: "tighter_of_both",
};

const valuation: QboInventoryValuationResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  items: [
    { item_ref: "1", item_display_name: "Widget", qty_on_hand: 10, asset_value_cents: 5_000 },
    { item_ref: "2", item_display_name: "Neg Qty", qty_on_hand: -2, asset_value_cents: 100 },
    { item_ref: "3", item_display_name: "Neg Value", qty_on_hand: 1, asset_value_cents: -50 },
    { item_ref: "4", item_display_name: "Both Neg", qty_on_hand: -1, asset_value_cents: -20 },
  ],
  total_cents: 5_030,
  raw_report_url: "https://example.invalid/inv",
  intuit_tid: "tid-inv",
};

const trial: QboTrialBalanceResult = {
  as_of_date: "2026-07-31",
  currency: "USD",
  lines: [
    {
      account_ref: "81",
      account_name: "Inventory",
      debit_cents: 4_800,
      credit_cents: 0,
      net_cents: 4_800,
    },
  ],
  raw_report_url: "https://example.invalid/tb",
  intuit_tid: "tid-tb",
};

describe("measureInventoryTieOut (locked formulas)", () => {
  it("28-34. signed debit-normal GL, no abs, qty precedence, variance_cents 0", () => {
    const measured = measureInventoryTieOut({
      valuation,
      trialBalance: trial,
      inventoryAccountId: "81",
      policy,
    });
    expect(measured.subTotalCents).toBe(5_030);
    expect(measured.glTotalCents).toBe(4_800);
    expect(measured.totalsVariance).toBe(230);
    expect(measured.itemRows[1]?.status).toBe("review");
    expect(measured.itemRows[1]?.classification_reason).toBe("item_negative_qty_on_hand");
    expect(measured.itemRows[2]?.classification_reason).toBe("item_negative_asset_value");
    expect(measured.itemRows[3]?.classification_reason).toBe("item_negative_qty_on_hand");
    expect(measured.itemRows.every((row) => row.variance_cents === 0)).toBe(true);
    expect(measured.itemRows[0]?.status).toBe("tie");
  });

  it("missing inventory account uses glTotalCents 0", () => {
    const measured = measureInventoryTieOut({
      valuation,
      trialBalance: trial,
      inventoryAccountId: "missing",
      policy,
    });
    expect(measured.glTotalCents).toBe(0);
    expect(measured.totalsVariance).toBe(5_030);
  });
});
