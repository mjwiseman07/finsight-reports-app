import { describe, it, expect } from "vitest";
import "@/lib/ap-intake/assertions/fingerprint-drift-within-threshold";
import {
  getAssertion,
  listApIntakeAssertions,
} from "@/lib/ap-intake/assertions/registry";
import { evaluateFingerprintDriftWithinThreshold } from "@/lib/ap-intake/assertions/fingerprint-drift-within-threshold";
import { computeDrift, type FingerprintPayload } from "@/lib/ap-intake/fingerprint/extractor";

describe("fingerprint_drift_within_threshold assertion", () => {
  it("registers under correct id and layer", () => {
    const reg = getAssertion("fingerprint_drift_within_threshold");
    expect(reg?.id).toBe("fingerprint_drift_within_threshold");
    expect(reg?.layer).toBe("L4");
    expect(listApIntakeAssertions().length).toBeGreaterThan(0);
  });

  it("first version returns pass with reason first_version_no_prior", async () => {
    const result = await evaluateFingerprintDriftWithinThreshold({
      firm_id: "firm-1",
      vendor_id: "vendor-1",
      version: 1,
    });
    expect(result.status).toBe("pass");
    expect(result.reason).toBe("first_version_no_prior");
  });

  it("drift exceeding pHash Hamming threshold returns fail HIGH", async () => {
    const prior: FingerprintPayload = {
      layout_bboxes: [],
      font_families: ["sans-serif"],
      color_palette: [[0, 0, 0, 100]],
      phash: Buffer.alloc(8, 0x00),
      dhash: Buffer.alloc(10, 0x00),
      extractor_version: "l4-v1.0.0",
    };
    const current: FingerprintPayload = {
      ...prior,
      phash: Buffer.alloc(8, 0xff),
    };
    const drift = computeDrift(prior, current);
    expect(drift.within_threshold).toBe(false);
    expect(drift.phash_hamming).toBeGreaterThan(8);
  });
});
