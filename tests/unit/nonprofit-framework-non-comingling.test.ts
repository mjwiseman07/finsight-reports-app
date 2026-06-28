import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  collectForbiddenMatches,
  IPSAS_NPO_FORBIDDEN_OUTPUT_SUBSTRINGS,
  USGAAP_NPO_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../lib/router/nonprofit/forbidden";
import { nonprofitLaneOutputText, runNonprofitRouter } from "../../lib/router/nonprofit";
import { emitFunctionalExpenseAllocation } from "../../lib/router/nonprofit/usgaap/functionalExpenseAllocation";
import { emitFunctionalExpenseDisclosure } from "../../lib/router/nonprofit/ipsas/functionalExpenseDisclosure";
import { buildNonprofitEmitterInput } from "../../lib/router/nonprofit/types";
import { MissingDisclosureInputError } from "../../lib/router/nonprofit/errors";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/g7-c7a-4");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("nonprofit framework non-comingling", () => {
  it("US GAAP lane output has zero IPSAS/IFRS forbidden substrings", () => {
    const extracted = loadFixture("usgaap/functionalExpenseAllocation/happy-501c3-charity.json");
    const output = nonprofitLaneOutputText(extracted, "us_gaap");
    expect(collectForbiddenMatches(output, USGAAP_NPO_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output.length).toBeGreaterThan(0);
  });

  it("IPSAS lane output has zero ASC/Form 990 forbidden substrings", () => {
    const extracted = loadFixture("ipsas/functionalExpenseDisclosure/happy-public-sector-nfp.json");
    const output = nonprofitLaneOutputText(extracted, "ipsas");
    expect(collectForbiddenMatches(output, IPSAS_NPO_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output.length).toBeGreaterThan(0);
  });

  it("cross-cutting framework-switch: same entity US GAAP then IPSAS both framework-pure", () => {
    const extracted = loadFixture("cross-cutting/framework-switch.json");
    const usOutput = nonprofitLaneOutputText(extracted, "us_gaap");
    const ipsasOutput = nonprofitLaneOutputText(
      { ...extracted, framework: "ipsas", rawFrameworkSignals: ["ipsas"], service_costs: extracted.service_costs },
      "ipsas",
    );
    expect(collectForbiddenMatches(usOutput, USGAAP_NPO_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(collectForbiddenMatches(ipsasOutput, IPSAS_NPO_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
  });

  it("ifrs_for_smes produces typed deferral marker without fake disclosure", () => {
    const extracted = loadFixture("cross-cutting/framework-switch.json");
    const deferred = runNonprofitRouter({
      ...extracted,
      rawFrameworkSignals: ["ifrs_for_smes"],
      framework: "ifrs",
    });
    expect(deferred.deferred?.status).toBe("deferred");
    expect(deferred.results.length).toBe(0);
  });

  it("US GAAP fail-closed throws MissingDisclosureInputError on missing nature", () => {
    const extracted = loadFixture("usgaap/functionalExpenseAllocation/fail-closed-missing-nature.json");
    expect(() => emitFunctionalExpenseAllocation(buildNonprofitEmitterInput(extracted))).toThrow(
      MissingDisclosureInputError,
    );
  });

  it("IPSAS fail-closed throws on missing function expenses", () => {
    const extracted = loadFixture("ipsas/functionalExpenseDisclosure/fail-closed-missing-function.json");
    expect(() => emitFunctionalExpenseDisclosure(buildNonprofitEmitterInput(extracted))).toThrow(
      MissingDisclosureInputError,
    );
  });

  it("comingling-rejected: US GAAP emitter output excludes prefilled IPSAS citation from input", () => {
    const extracted = loadFixture("usgaap/functionalExpenseAllocation/comingling-rejected-ipsas-citation.json");
    const result = emitFunctionalExpenseAllocation(buildNonprofitEmitterInput(extracted));
    const output = result.lines.map((line) => line.text).join("\n");
    expect(collectForbiddenMatches(output, USGAAP_NPO_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
  });
});
