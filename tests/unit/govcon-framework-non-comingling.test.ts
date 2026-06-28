import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  collectForbiddenMatches,
  collectIfrsFarCasDcaaMatches,
  IFRS_GOVCON_FORBIDDEN_OUTPUT_SUBSTRINGS,
  USGAAP_GOVCON_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../lib/router/govcon/forbidden";
import { govconLaneOutputText } from "../../lib/router/govcon";
import { emitIndirectRateStructure } from "../../lib/router/govcon/usgaap/indirectRateStructure";
import { emitBacklogDisclosure } from "../../lib/router/govcon/ifrs/backlogDisclosure";
import { buildGovconEmitterInput } from "../../lib/router/govcon/types";
import { MissingDisclosureInputError } from "../../lib/router/govcon/errors";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/g7-c7a-8");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("govcon framework non-comingling", () => {
  it("US GAAP lane output has zero IFRS forbidden substrings", () => {
    const extracted = loadFixture("usgaap/contractTypeMixDisclosure/happy-defense-contractor.json");
    const output = govconLaneOutputText(extracted, "us_gaap");
    expect(collectForbiddenMatches(output, USGAAP_GOVCON_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output.length).toBeGreaterThan(0);
  });

  it("IFRS lane output has zero ASC/FAR/CAS/DCAA forbidden substrings", () => {
    const extracted = loadFixture("ifrs/contractTypeMixDisclosure/happy-eu-defense-contractor.json");
    const output = govconLaneOutputText(extracted, "ifrs");
    expect(collectForbiddenMatches(output, IFRS_GOVCON_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(collectIfrsFarCasDcaaMatches(output)).toEqual([]);
    expect(output.length).toBeGreaterThan(0);
  });

  it("cross-cutting Lockheed-vs-BAE framework-switch: US GAAP FAR/CAS then IFRS segment disaggregation both framework-pure", () => {
    const extracted = loadFixture("cross-cutting/lockheed-vs-bae-framework-switch.json");
    const usOutput = govconLaneOutputText(extracted, "us_gaap");
    const ifrsOutput = govconLaneOutputText(
      {
        ...extracted,
        framework: "ifrs",
        rawFrameworkSignals: ["ifrs-full"],
        govcon: {
          contracts: { by_type: { fixed_price: 45, cost_reimbursable: 30, incentive: 15 } },
          customer_concentration: { us_government_pct: 0 },
          backlog: { funded: 9_500_000_000, unfunded: 4_200_000_000, horizon_years: [3, 5, 7] },
        },
      },
      "ifrs",
    );
    expect(collectForbiddenMatches(usOutput, USGAAP_GOVCON_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(collectForbiddenMatches(ifrsOutput, IFRS_GOVCON_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(collectIfrsFarCasDcaaMatches(ifrsOutput)).toEqual([]);
    expect(usOutput).toMatch(/FFP|CAS|FAR/i);
    expect(ifrsOutput).toMatch(/IFRS 8|operating segment/i);
  });

  it("US GAAP fail-closed throws MissingDisclosureInputError on missing indirect rates", () => {
    const extracted = loadFixture("usgaap/indirectRateStructure/fail-closed-missing-rates.json");
    expect(() => emitIndirectRateStructure(buildGovconEmitterInput(extracted))).toThrow(
      MissingDisclosureInputError,
    );
  });

  it("IFRS fail-closed throws on missing backlog horizon", () => {
    const extracted = loadFixture("ifrs/backlogDisclosure/fail-closed-missing-horizon.json");
    expect(() => emitBacklogDisclosure(buildGovconEmitterInput(extracted))).toThrow(
      MissingDisclosureInputError,
    );
  });

  it("comingling-rejected: IFRS emitter output excludes prefilled FAR/CAS citation from input narrative", () => {
    const extracted = loadFixture("ifrs/contractTypeMixDisclosure/comingling-rejected-far-leakage.json");
    const output = govconLaneOutputText(extracted, "ifrs");
    expect(collectIfrsFarCasDcaaMatches(output)).toEqual([]);
  });
});
