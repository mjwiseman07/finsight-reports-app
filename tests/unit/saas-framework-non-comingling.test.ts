import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  collectForbiddenMatches,
  IFRS_SAAS_FORBIDDEN_OUTPUT_SUBSTRINGS,
  USGAAP_SAAS_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../lib/router/saas/forbidden";
import { saasLaneOutputText } from "../../lib/router/saas";
import { emitContractAssetLiabilitySplit } from "../../lib/router/saas/usgaap/contractAssetLiabilitySplit";
import { emitContractAssetLiabilitySplit as emitIfrsBalances } from "../../lib/router/saas/ifrs/contractAssetLiabilitySplit";
import { buildSaasEmitterInput } from "../../lib/router/saas/types";
import { MissingDisclosureInputError } from "../../lib/router/saas/errors";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/g7-c7a-5");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("saas framework non-comingling", () => {
  it("US GAAP lane output has zero IFRS forbidden substrings", () => {
    const extracted = loadFixture("happy/adbe-10k.json");
    const output = saasLaneOutputText(extracted, "us_gaap");
    expect(collectForbiddenMatches(output, USGAAP_SAAS_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output.length).toBeGreaterThan(0);
  });

  it("IFRS lane output has zero ASC 606/340 forbidden substrings", () => {
    const extracted = loadFixture("happy/sap-20f.json");
    const output = saasLaneOutputText(extracted, "ifrs");
    expect(collectForbiddenMatches(output, IFRS_SAAS_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output.length).toBeGreaterThan(0);
  });

  it("cross-cutting framework-switch: US GAAP then IFRS both framework-pure", () => {
    const extracted = loadFixture("cross-cutting/framework-switch.json");
    const usOutput = saasLaneOutputText(extracted, "us_gaap");
    const ifrsOutput = saasLaneOutputText(
      { ...extracted, framework: "ifrs", rawFrameworkSignals: ["ifrs-full"] },
      "ifrs",
    );
    expect(collectForbiddenMatches(usOutput, USGAAP_SAAS_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(collectForbiddenMatches(ifrsOutput, IFRS_SAAS_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
  });

  it("US GAAP fail-closed throws MissingDisclosureInputError on missing rollforward", () => {
    const extracted = loadFixture("usgaap/contractAssetLiabilitySplit/fail-closed-missing-input.json");
    expect(() => emitContractAssetLiabilitySplit(buildSaasEmitterInput(extracted))).toThrow(
      MissingDisclosureInputError,
    );
  });

  it("IFRS fail-closed throws on missing rollforward", () => {
    const extracted = loadFixture("ifrs/contractAssetLiabilitySplit/fail-closed-missing-input.json");
    expect(() => emitIfrsBalances(buildSaasEmitterInput(extracted))).toThrow(MissingDisclosureInputError);
  });

  it("comingling-rejected: US GAAP emitter output excludes prefilled IFRS citation from input narrative", () => {
    const extracted = loadFixture("usgaap/revenueDisaggregation/comingling-rejected.json");
    const output = saasLaneOutputText(extracted, "us_gaap");
    expect(collectForbiddenMatches(output, USGAAP_SAAS_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
  });
});
