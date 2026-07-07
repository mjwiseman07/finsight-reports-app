import { describe, it, expect } from "vitest";
import { computeAllowedDelta } from "./schema";
describe("three-way-match schema", () => {
  it("computes 2% tolerance", () => {
    expect(computeAllowedDelta(100_000)).toBe(2_000);
  });
  it("enforces floor of 100 cents", () => {
    expect(computeAllowedDelta(1_000)).toBe(100);
  });
});
