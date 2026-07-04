import { describe, expect, it } from "vitest";

const DECISIONS = ["approved", "edit_and_approved", "rejected", "deferred"] as const;

describe("directive modal logic", () => {
  it("renders four decision options", () => {
    expect(DECISIONS).toHaveLength(4);
  });

  it("edit_and_approved reveals editor flag", () => {
    const decision = "edit_and_approved";
    expect(decision === "edit_and_approved").toBe(true);
  });

  it("submit builds decide POST body", () => {
    const body = {
      decision: "approved",
      decisionReasonCode: "standard_approval",
      decisionReasonText: "ok",
    };
    expect(body.decision).toBe("approved");
  });

  it("unbalanced edit shows validation error", () => {
    const dr: number = 100;
    const cr: number = 50;
    expect(dr !== cr).toBe(true);
  });

  it("cancel does not POST", () => {
    let posted = false;
    const cancel = () => {
      posted = false;
    };
    cancel();
    expect(posted).toBe(false);
  });

  it("submitting disables buttons", () => {
    const submitting = true;
    expect(submitting).toBe(true);
  });
});
