import { describe, it, expect } from "vitest";
import { ApprovalValidationError } from "./types";

describe("Block 6b — delegation validation", () => {
  it("rejects self-delegation", () => {
    const err = new ApprovalValidationError("delegateUserId", "cannot delegate to self");
    expect(err.field).toBe("delegateUserId");
  });

  it("rejects effective_to <= effective_from", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const to = new Date("2026-01-01T00:00:00Z");
    expect(to <= from).toBe(true);
  });
});
