import { describe, it, expect } from "vitest";
import { computeAgeBucket } from "./age-bucket.js";

describe("computeAgeBucket", () => {
  it("returns new_this_close when period_end matches closed_at", () => {
    expect(
      computeAgeBucket("2026-06-30", {
        closed_at: "2026-06-30",
        audit_period_end: null,
      }),
    ).toBe("new_this_close");
  });

  it("returns new_this_close when period_end matches audit_period_end (no closed_at)", () => {
    expect(
      computeAgeBucket("2026-06-30", {
        closed_at: null,
        audit_period_end: "2026-06-30",
      }),
    ).toBe("new_this_close");
  });

  it("prefers closed_at over audit_period_end", () => {
    expect(
      computeAgeBucket("2026-05-31", {
        closed_at: "2026-05-31",
        audit_period_end: "2026-06-30",
      }),
    ).toBe("new_this_close");
  });

  it("returns stale when period_end is >90d before anchor", () => {
    expect(
      computeAgeBucket("2026-01-01", {
        closed_at: "2026-06-30",
        audit_period_end: null,
      }),
    ).toBe("stale");
  });

  it("returns carried_over when inside 90-day window", () => {
    expect(
      computeAgeBucket("2026-05-01", {
        closed_at: "2026-06-30",
        audit_period_end: null,
      }),
    ).toBe("carried_over");
  });

  it("returns carried_over when no anchors", () => {
    expect(
      computeAgeBucket("2026-06-30", {
        closed_at: null,
        audit_period_end: null,
      }),
    ).toBe("carried_over");
  });

  it("returns carried_over for invalid dates", () => {
    expect(
      computeAgeBucket("not-a-date", {
        closed_at: "2026-06-30",
        audit_period_end: null,
      }),
    ).toBe("carried_over");
  });
});
