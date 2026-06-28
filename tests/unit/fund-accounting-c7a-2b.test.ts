import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  collectForbiddenMatches,
  collectSecFormMatches,
  IFRS_FA_FORBIDDEN_OUTPUT_SUBSTRINGS,
  USGAAP_FA_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../lib/router/fund-accounting/forbidden";
import { emitterSatisfiesAssertion, fundAccountingLaneOutputText, runFundAccountingRouter } from "../../lib/router/fund-accounting";
import { emitTopHoldingsDisclosure } from "../../lib/router/fund-accounting/usgaap/topHoldingsDisclosure";
import { buildFundAccountingEmitterInput } from "../../lib/router/fund-accounting/types";
import { MissingDisclosureInputError } from "../../lib/router/fund-accounting/errors";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/g7-c7a-2b");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("fund-accounting C7a-2b framework non-comingling", () => {
  it("US GAAP lane output has zero IFRS forbidden substrings across new emitters", () => {
    const extracted = loadFixture("usgaap/topHoldingsDisclosure/happy-fxaix-top10.json");
    const output = fundAccountingLaneOutputText(extracted, "us_gaap");
    expect(collectForbiddenMatches(output, USGAAP_FA_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/Top 10 portfolio holdings/i);
  });

  it("IFRS lane output has zero ASC and SEC-form forbidden substrings", () => {
    const extracted = loadFixture("ifrs/topHoldingsDisclosure/happy-eu-fund-top10.json");
    const output = fundAccountingLaneOutputText(extracted, "ifrs");
    expect(collectForbiddenMatches(output, IFRS_FA_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(collectSecFormMatches(output)).toEqual([]);
    expect(output.length).toBeGreaterThan(0);
  });

  it("cross-cutting VFIAX full-suite: US GAAP full stack vs IFRS substitute both framework-pure", () => {
    const extracted = loadFixture("cross-cutting/fa-full-suite-vfiax.json");
    const usOutput = fundAccountingLaneOutputText(extracted, "us_gaap");
    const ifrsOutput = fundAccountingLaneOutputText(
      { ...extracted, framework: "ifrs", rawFrameworkSignals: ["ifrs-full"] },
      "ifrs",
    );
    expect(collectForbiddenMatches(usOutput, USGAAP_FA_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(collectForbiddenMatches(ifrsOutput, IFRS_FA_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(collectSecFormMatches(ifrsOutput)).toEqual([]);
    expect(usOutput).toMatch(/ASC 946|Item 31/i);
    expect(ifrsOutput).toMatch(/IFRS 13|IFRS 9/i);
    expect(emitterSatisfiesAssertion(runFundAccountingRouter(extracted).results, "top-holdings").satisfied).toBe(
      true,
    );
  });

  it("US GAAP fail-closed throws MissingDisclosureInputError on missing holdings entries", () => {
    const extracted = loadFixture("usgaap/topHoldingsDisclosure/fail-closed-missing-entries.json");
    expect(() => emitTopHoldingsDisclosure(buildFundAccountingEmitterInput(extracted))).toThrow(
      MissingDisclosureInputError,
    );
  });

  it("comingling-rejected: IFRS brokerage output excludes SEC form identifiers", () => {
    const extracted = loadFixture("ifrs/brokerageCommissionDisclosure/happy-eu-transaction-costs.json");
    const output = fundAccountingLaneOutputText(extracted, "ifrs");
    expect(collectSecFormMatches(output)).toEqual([]);
  });
});
