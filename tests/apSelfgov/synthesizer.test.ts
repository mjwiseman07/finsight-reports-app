import { describe, it, expect } from "vitest";
import {
  synthesizeAmendmentDrafts,
  MIN_CONFIDENCE_THRESHOLD,
  type ObservationSample,
} from "@/lib/ap-intake/selfgov/service";

function mkObs(
  n: number,
  setting: string,
  layer: ObservationSample["source_layer"] = "L9",
): ObservationSample[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `obs-${setting}-${i}`,
    source_layer: layer,
    observation_type: "reviewer_rejected",
    target_setting: setting,
    observed_value: { value: 42 },
  }));
}

describe("synthesizeAmendmentDrafts", () => {
  it("returns empty when no observations", () => {
    expect(synthesizeAmendmentDrafts([], {}, "firm_admin")).toEqual([]);
  });

  it("returns empty when cluster is below minimum size (2 observations)", () => {
    const drafts = synthesizeAmendmentDrafts(
      mkObs(2, "interlock_reviewer_role_slug"),
      {},
      "firm_admin",
    );
    expect(drafts).toEqual([]);
  });

  it("emits a draft when cluster has 3+ observations", () => {
    const drafts = synthesizeAmendmentDrafts(
      mkObs(3, "interlock_reviewer_role_slug"),
      { interlock_reviewer_role_slug: "firm_admin" },
      "firm_admin",
    );
    expect(drafts.length).toBe(1);
    expect(drafts[0].target_setting).toBe("interlock_reviewer_role_slug");
    expect(drafts[0].confidence_score).toBeGreaterThanOrEqual(MIN_CONFIDENCE_THRESHOLD);
    expect(drafts[0].reviewer_role_slug).toBe("firm_admin");
  });

  it("caps confidence at 0.95 for large clusters", () => {
    const drafts = synthesizeAmendmentDrafts(
      mkObs(50, "aged_prepay_threshold_days"),
      { aged_prepay_threshold_days: 90 },
      "controller",
    );
    expect(drafts.length).toBe(1);
    expect(drafts[0].confidence_score).toBe(0.95);
  });

  it("clusters by target_setting independently", () => {
    const drafts = synthesizeAmendmentDrafts(
      [...mkObs(3, "setting_a"), ...mkObs(4, "setting_b"), ...mkObs(2, "setting_c")],
      {},
      "firm_admin",
    );
    const settings = drafts.map((d) => d.target_setting).sort();
    expect(settings).toEqual(["setting_a", "setting_b"]);
  });

  it("captures unique source_layer + observation_type combinations in reason_codes", () => {
    const drafts = synthesizeAmendmentDrafts(
      [...mkObs(2, "s", "L9"), ...mkObs(2, "s", "L11")],
      {},
      "firm_admin",
    );
    expect(drafts.length).toBe(1);
    expect(drafts[0].reason_codes.sort()).toEqual(
      ["L11:reviewer_rejected", "L9:reviewer_rejected"].sort(),
    );
  });
});
