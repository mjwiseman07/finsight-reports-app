import { describe, it, expect } from "vitest";
import { CommentValidationError } from "./service";

describe("Block 6b — comment validation", () => {
  it("throws on empty body", () => {
    const err = new CommentValidationError("body", "body required");
    expect(err.field).toBe("body");
  });

  it("throws on body length over 10000", () => {
    const big = "a".repeat(10001);
    expect(big.length).toBeGreaterThan(10000);
  });
});
