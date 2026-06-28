import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import {
  emitterSatisfiesAssertion,
  runHealthcareRouter,
} from "../../../lib/router/healthcare";
import { CITATION_RESOLVED as US_CHNA_CITATION } from "../../../lib/router/healthcare/usgaap/chnaCycleDisclosure";
import { assertUsgaapCitationNonComingling } from "../../../lib/router/types";

const FIXTURE_ROOT = join(import.meta.dirname, "../../fixtures/g7-c7a-3");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("G7-C7a-3 healthcare router emitters", () => {
  it("happy path: HLMA IFRS satisfies chna-cycle via community-benefit substitute", () => {
    const extracted = loadFixture("happy/HLMA-annual-ifrs.json");
    const router = runHealthcareRouter(extracted);
    expect(emitterSatisfiesAssertion(router.results, "chna-cycle").satisfied).toBe(true);
  });

  it("happy path: 501(c)(3) US hospital satisfies chna-cycle and community-benefit-report", () => {
    const extracted = loadFixture("happy/501c3-hospital-usgaap.json");
    const router = runHealthcareRouter(extracted);
    expect(emitterSatisfiesAssertion(router.results, "chna-cycle").satisfied).toBe(true);
    expect(emitterSatisfiesAssertion(router.results, "community-benefit-report").satisfied).toBe(true);
    assertUsgaapCitationNonComingling(US_CHNA_CITATION);
  });

  it("gated dormant: taxable HCA does not satisfy chna-cycle (C7a-3a scope)", () => {
    const extracted = loadFixture("happy/HCA-10k-usgaap.json");
    const router = runHealthcareRouter(extracted);
    expect(emitterSatisfiesAssertion(router.results, "chna-cycle").satisfied).toBe(false);
    expect(router.results.find((r) => r.emitterId === "chna-cycle")?.failureReason).toMatch(/dormant/i);
  });

  it("fail-closed: non-HC vertical yields no satisfied emitters", () => {
    const extracted = loadFixture("fail-closed/non-hc-corpus.json");
    const router = runHealthcareRouter(extracted);
    expect(router.results.every((result) => result.status === "fail-closed")).toBe(true);
  });
});
