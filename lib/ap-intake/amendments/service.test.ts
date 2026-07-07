import { describe, it, expect } from "vitest";
import { AmendmentValidationError } from "./service";

describe("Block 6b — amendment validation", () => {
  it("throws on missing reason", () => {
    const err = new AmendmentValidationError("reason", "reason required");
    expect(err.field).toBe("reason");
  });

  it("throws on negative newTotalCents", () => {
    const err = new AmendmentValidationError("newTotalCents", "must be >= 0");
    expect(err.field).toBe("newTotalCents");
  });
});
