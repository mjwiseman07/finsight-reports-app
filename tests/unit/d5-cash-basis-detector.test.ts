import { describe, expect, it } from "vitest";
import { isCashBasisClient } from "@/lib/recurring/cash-basis-detector";

describe("D5.6 — isCashBasisClient", () => {
  it("returns true for exact 'cash'", () => {
    expect(isCashBasisClient("cash")).toBe(true);
  });
  it("returns false for 'accrual'", () => {
    expect(isCashBasisClient("accrual")).toBe(false);
  });
  it("returns false for 'modified_cash' (strict match)", () => {
    expect(isCashBasisClient("modified_cash")).toBe(false);
  });
  it("returns false for null", () => {
    expect(isCashBasisClient(null)).toBe(false);
  });
  it("returns false for undefined", () => {
    expect(isCashBasisClient(undefined)).toBe(false);
  });
  it("returns false for empty string", () => {
    expect(isCashBasisClient("")).toBe(false);
  });
});
