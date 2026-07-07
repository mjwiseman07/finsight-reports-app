import { describe, it, expect } from "vitest";
import { NO_DUPLICATE_BILLS_POSTED } from "@/lib/ap-intake/assertions/no-duplicate-bills-posted";

describe("no_duplicate_bills_posted assertion contract", () => {
  it("exports L5 contract with expected id and enforcement module", () => {
    expect(NO_DUPLICATE_BILLS_POSTED.id).toBe("no_duplicate_bills_posted");
    expect(NO_DUPLICATE_BILLS_POSTED.layer).toBe("L5");
    expect(NO_DUPLICATE_BILLS_POSTED.enforced_by).toContain("duplicate/detector");
  });
});
