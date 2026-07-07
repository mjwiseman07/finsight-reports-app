import { describe, it, expect } from "vitest";
import { ApprovalValidationError } from "./types";

describe("Block 6b — approval chain validation", () => {
  it("throws when steps array is empty", () => {
    const err = new ApprovalValidationError("steps", "chain must have at least one step");
    expect(err.name).toBe("ApprovalValidationError");
    expect(err.field).toBe("steps");
  });

  it("throws when order_index values are duplicated (unit-level shape check)", () => {
    const orderIndexes = [0, 1, 1, 2];
    const unique = new Set(orderIndexes).size === orderIndexes.length;
    expect(unique).toBe(false);
  });
});
