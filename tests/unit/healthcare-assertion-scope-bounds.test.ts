import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  packOutputText,
  runChnaCoverage,
  runCommunityBenefitCoverage,
  runTaxableHcDisclosureCoverage,
  TAXABLE_HC_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../assertion-packs/healthcare";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/g7-c7a-3a");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

function assertTaxablePackNoForbidden(output: string): void {
  for (const forbidden of TAXABLE_HC_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    expect(output.includes(forbidden)).toBe(false);
  }
}

describe("healthcare assertion scope bounds", () => {
  const taxableFixtures = [
    "taxable-hc-disclosure-coverage/happy-hca-10k.json",
    "taxable-hc-disclosure-coverage/happy-cvs-10k.json",
    "taxable-hc-disclosure-coverage/happy-thc-10k.json",
    "taxable-hc-disclosure-coverage/happy-uhs-10k.json",
  ];

  for (const fixture of taxableFixtures) {
    it(`forbidden-substring guard: ${fixture}`, () => {
      const extracted = loadFixture(fixture);
      const taxable = runTaxableHcDisclosureCoverage(extracted);
      expect(taxable.skipped).toBe(false);
      if (!taxable.skipped) {
        assertTaxablePackNoForbidden(taxable.outputText);
      }
    });
  }

  it("chna-coverage: skipped for taxable HCA", () => {
    const outcome = runChnaCoverage(loadFixture("chna-coverage/skipped-taxable-hcs.json"));
    expect(outcome.skipped).toBe(true);
  });

  it("community-benefit-coverage: skipped for taxable CVS", () => {
    const outcome = runCommunityBenefitCoverage(loadFixture("community-benefit-coverage/skipped-taxable-cvs.json"));
    expect(outcome.skipped).toBe(true);
  });

  it("taxable-hc-disclosure-coverage: runs full battery for HCA", () => {
    const outcome = runTaxableHcDisclosureCoverage(loadFixture("taxable-hc-disclosure-coverage/happy-hca-10k.json"));
    expect(outcome.skipped).toBe(false);
    if (!outcome.skipped) {
      expect(outcome.assertions.every((a) => a.passed)).toBe(true);
    }
  });

  it("cross-cutting: HCA runs all three packs with expected outcomes", () => {
    const extracted = loadFixture("cross-cutting/taxable-hc-full-suite.json");
    const chna = runChnaCoverage(extracted);
    const community = runCommunityBenefitCoverage(extracted);
    const taxable = runTaxableHcDisclosureCoverage(extracted);
    expect(chna.skipped).toBe(true);
    expect(community.skipped).toBe(true);
    expect(taxable.skipped).toBe(false);
    if (!taxable.skipped) {
      expect(taxable.assertions.every((a) => a.passed)).toBe(true);
      assertTaxablePackNoForbidden(taxable.outputText);
    }
  });
});
