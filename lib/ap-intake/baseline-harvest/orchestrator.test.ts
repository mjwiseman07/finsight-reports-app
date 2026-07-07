import { describe, it, expect } from "vitest";
import { CSV_TEMPLATES } from "./csv-templates";
describe("baseline-harvest", () => {
  it("exposes 4 CSV templates", () => {
    expect(Object.keys(CSV_TEMPLATES).sort()).toEqual([
      "bills",
      "goods_receipts",
      "purchase_orders",
      "vendors",
    ]);
  });
  it("purchase_orders template has line columns", () => {
    expect(CSV_TEMPLATES.purchase_orders.headers).toContain("line_number");
    expect(CSV_TEMPLATES.purchase_orders.headers).toContain("line_unit_price_cents");
  });
});
