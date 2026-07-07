import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateCreate, computeTotals, RequisitionValidationError } from "./validators";
describe("validateCreate", () => {
  const base = {
    firmClientId: "fc-1",
    requesterUserId: "u-1",
    lines: [{ description: "Widget", quantity: 2, unit_price_cents: 500 }],
  };
  it("passes on valid input", () => {
    expect(() => validateCreate(base)).not.toThrow();
  });
  it("rejects missing firmClientId", () => {
    expect(() => validateCreate({ ...base, firmClientId: "" })).toThrow(RequisitionValidationError);
  });
  it("rejects empty lines", () => {
    expect(() => validateCreate({ ...base, lines: [] })).toThrow(RequisitionValidationError);
  });
  it("rejects negative quantity", () => {
    expect(() =>
      validateCreate({ ...base, lines: [{ description: "x", quantity: -1, unit_price_cents: 100 }] }),
    ).toThrow(RequisitionValidationError);
  });
  it("rejects non-integer unit_price_cents", () => {
    expect(() =>
      validateCreate({ ...base, lines: [{ description: "x", quantity: 1, unit_price_cents: 1.5 }] }),
    ).toThrow(RequisitionValidationError);
  });
});
describe("computeTotals", () => {
  it("sums quantity * unit_price", () => {
    const r = computeTotals([
      { description: "a", quantity: 2, unit_price_cents: 500 },
      { description: "b", quantity: 3, unit_price_cents: 250 },
    ]);
    expect(r.subtotalCents).toBe(1750);
    expect(r.totalCents).toBe(1750);
  });
});
