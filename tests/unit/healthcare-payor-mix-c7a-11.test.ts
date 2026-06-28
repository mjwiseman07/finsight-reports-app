import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  collectForbiddenMatches,
  IFRS_HC_REVENUE_FORBIDDEN_OUTPUT_SUBSTRINGS,
  USGAAP_HC_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../lib/router/lanes/healthcare/forbidden";
import {
  IPCBadDebtMislabelError,
  IPCMethodologyMissingError,
  IFRS9ForwardLookingMissingError,
  IFRS9StageIncompleteError,
  IfrsUsPayorCominglingError,
  PreAsc606BadDebtModelError,
} from "../../lib/router/lanes/healthcare/errors";
import { emitAllowanceRollforward } from "../../lib/router/lanes/healthcare/emitters/allowanceRollforward";
import { emitImplicitPriceConcession } from "../../lib/router/lanes/healthcare/emitters/implicitPriceConcession";
import { emitPayorMixDisaggregation } from "../../lib/router/lanes/healthcare/emitters/payorMixDisaggregation";
import { emitPayorMixIFRS } from "../../lib/router/lanes/healthcare/emitters/ifrs/payorMixIFRS";
import { emitReceivablesECL } from "../../lib/router/lanes/healthcare/emitters/ifrs/receivablesECL";
import {
  buildIfrs15EmitterInput,
  buildIfrs9EmitterInput,
  buildUsgaapAsc606EmitterInput,
} from "../../lib/router/lanes/healthcare/types";
import {
  emitterSatisfiesAssertion,
  ifrsHealthcareRevenueOutputText,
  runHealthcareRouter,
  usgaapHealthcareRevenueOutputText,
} from "../../lib/router/healthcare";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/healthcare");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("healthcare C7a-11 payor mix + IPC + IFRS 9 ECL", () => {
  it("payorMixDisaggregation happy HCA-10k disaggregates Medicare Traditional and Advantage", () => {
    const extracted = loadFixture("payor-mix/happy-hca-10k-full.json");
    const output = usgaapHealthcareRevenueOutputText(extracted);
    expect(collectForbiddenMatches(output, USGAAP_HC_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/Medicare Traditional/);
    expect(output).toMatch(/Medicare Advantage/);
    expect(output).toMatch(/606-10-50-5/);
    expect(emitterSatisfiesAssertion(runHealthcareRouter(extracted).results, "payor-mix").satisfied).toBe(true);
  });

  it("implicitPriceConcession happy HCA-10k uses portfolio methodology at contract inception", () => {
    const extracted = loadFixture("payor-mix/happy-hca-10k-full.json");
    const output = usgaapHealthcareRevenueOutputText(extracted);
    expect(output).toMatch(/portfolio approach/i);
    expect(output).toMatch(/contract inception/i);
    expect(output).not.toMatch(/bad debt expense/i);
    expect(emitterSatisfiesAssertion(runHealthcareRouter(extracted).results, "bad-debt-vs-charity").satisfied).toBe(
      true,
    );
  });

  it("allowanceRollforward happy CVS-10k residual CECL rollforward under 2% sanity", () => {
    const extracted = loadFixture("payor-mix/happy-cvs-10k-full.json");
    const output = usgaapHealthcareRevenueOutputText(extracted);
    expect(output).toMatch(/residual allowance/i);
    expect(output).toMatch(/ASC 326/);
    expect(emitterSatisfiesAssertion(runHealthcareRouter(extracted).results, "bad-debt-vs-charity").satisfied).toBe(
      true,
    );
  });

  it("IFRS receivablesECL happy HLMA-annual has 3-stage ECL and forward-looking inputs", () => {
    const extracted = loadFixture("payor-mix/ifrs/happy-hlma-annual-full.json");
    const output = ifrsHealthcareRevenueOutputText(extracted);
    expect(collectForbiddenMatches(output, IFRS_HC_REVENUE_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/Stage 1/i);
    expect(output).toMatch(/Stage 2/i);
    expect(output).toMatch(/Stage 3/i);
    expect(output).toMatch(/12-month ECL/i);
    expect(output).toMatch(/lifetime ECL/i);
    expect(emitterSatisfiesAssertion(runHealthcareRouter(extracted).results, "bad-debt-vs-charity").satisfied).toBe(
      true,
    );
  });

  it("IFRS payorMixIFRS happy HLMA-annual uses NHS taxonomy not US payors", () => {
    const extracted = loadFixture("payor-mix/ifrs/happy-hlma-annual-full.json");
    const output = ifrsHealthcareRevenueOutputText(extracted);
    expect(output).toMatch(/NHS England/i);
    expect(output).not.toMatch(/Medicare/i);
    expect(emitterSatisfiesAssertion(runHealthcareRouter(extracted).results, "payor-mix").satisfied).toBe(true);
  });

  it("IPC fail-closed throws IPCMethodologyMissingError on missing lookback", () => {
    const extracted = loadFixture("payor-mix/reject-ipc-methodology-missing.json");
    expect(() => emitImplicitPriceConcession(buildUsgaapAsc606EmitterInput(extracted))).toThrow(
      IPCMethodologyMissingError,
    );
  });

  it("allowanceRollforward rejects pre-ASC 606 bad-debt model above 5% of revenue", () => {
    const extracted = loadFixture("payor-mix/reject-pre-asc606-bad-debt.json");
    expect(() => emitAllowanceRollforward(buildUsgaapAsc606EmitterInput(extracted))).toThrow(
      PreAsc606BadDebtModelError,
    );
  });

  it("IFRS payor mix rejects US Medicare payor class names", () => {
    const extracted = loadFixture("payor-mix/ifrs/reject-us-payor-in-ifrs-lane.json");
    expect(() => emitPayorMixIFRS(buildIfrs15EmitterInput(extracted))).toThrow(IfrsUsPayorCominglingError);
  });

  it("IFRS ECL fail-closed throws on missing forward-looking macroeconomic inputs", () => {
    const extracted = loadFixture("payor-mix/ifrs/reject-ifrs9-forward-looking-missing.json");
    expect(() => emitReceivablesECL(buildIfrs9EmitterInput(extracted))).toThrow(IFRS9ForwardLookingMissingError);
  });

  it("IFRS ECL fail-closed throws on incomplete stage reconciliation", () => {
    const extracted = loadFixture("payor-mix/ifrs/reject-ifrs9-stage-incomplete.json");
    expect(() => emitReceivablesECL(buildIfrs9EmitterInput(extracted))).toThrow(IFRS9StageIncompleteError);
  });

  it("US GAAP framework rejects IFRS 9 ECL inputs on us-gaap filing", () => {
    const extracted = loadFixture("payor-mix/framework-rejection-ifrs-ecl-on-usgaap.json");
    const router = runHealthcareRouter(extracted);
    expect(router.frameworkViolation?.citation).toBe("ASC 606");
    expect(router.results.length).toBe(0);
  });

  it("cross-cutting HCA-10K-PAYOR: US GAAP ASC 606 suite is framework-pure", () => {
    const extracted = loadFixture("cross-cutting/HCA-10K-PAYOR.json");
    const output = usgaapHealthcareRevenueOutputText(extracted);
    expect(collectForbiddenMatches(output, USGAAP_HC_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/implicit price concession/i);
    expect(output).toMatch(/payor class/i);
    const router = runHealthcareRouter(extracted);
    expect(router.results.filter((r) => r.status === "satisfied" && r.emitterPath.includes("/lanes/healthcare/")).length).toBe(
      3,
    );
  });

  it("cross-cutting NHS-AR-RECEIVABLES: IFRS 9 ECL + IFRS 15 payor mix framework-pure", () => {
    const extracted = loadFixture("cross-cutting/NHS-AR-RECEIVABLES.json");
    const output = ifrsHealthcareRevenueOutputText(extracted);
    expect(collectForbiddenMatches(output, IFRS_HC_REVENUE_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/IFRS 9/);
    expect(output).toMatch(/IFRS 15/);
    const router = runHealthcareRouter(extracted);
    expect(router.results.filter((r) => r.status === "satisfied").length).toBe(2);
  });

  it("cross-cutting framework-switch: HCA US GAAP vs NHS IFRS both framework-pure", () => {
    const hca = loadFixture("cross-cutting/HCA-10K-PAYOR.json");
    const nhs = loadFixture("cross-cutting/NHS-AR-RECEIVABLES.json");
    const usOutput = usgaapHealthcareRevenueOutputText(hca);
    const ifrsOutput = ifrsHealthcareRevenueOutputText(nhs);
    expect(collectForbiddenMatches(usOutput, USGAAP_HC_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(collectForbiddenMatches(ifrsOutput, IFRS_HC_REVENUE_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(usOutput).toMatch(/ASC 606/);
    expect(ifrsOutput).toMatch(/IFRS 9/);
  });

  it("IPCBadDebtMislabelError documents ASU 2014-09 revenue-not-expense guardrail", () => {
    const err = new IPCBadDebtMislabelError();
    expect(err.citation).toMatch(/ASU 2014-09/);
    expect(err.remediation).toMatch(/reduction of revenue/i);
  });

  it("US GAAP emitters branch on US_GAAP_ASC606 framework gate", () => {
    const paths = [
      "lib/router/lanes/healthcare/emitters/payorMixDisaggregation.ts",
      "lib/router/lanes/healthcare/emitters/implicitPriceConcession.ts",
      "lib/router/lanes/healthcare/emitters/allowanceRollforward.ts",
    ];
    for (const rel of paths) {
      const source = readFileSync(join(import.meta.dirname, "../..", rel), "utf8");
      expect(source).toMatch(/US_GAAP_ASC606/);
    }
  });

  it("IFRS emitters branch on IFRS_15 / IFRS_9 framework gates", () => {
    const payorSource = readFileSync(
      join(import.meta.dirname, "../..", "lib/router/lanes/healthcare/emitters/ifrs/payorMixIFRS.ts"),
      "utf8",
    );
    const eclSource = readFileSync(
      join(import.meta.dirname, "../..", "lib/router/lanes/healthcare/emitters/ifrs/receivablesECL.ts"),
      "utf8",
    );
    expect(payorSource).toMatch(/IFRS_15/);
    expect(eclSource).toMatch(/IFRS_9/);
  });

  it("payorMixDisaggregation happy THC-10k and UHS-10k satisfy payor-mix assertion", () => {
    for (const fixture of ["payor-mix/happy-thc-10k-full.json", "payor-mix/happy-uhs-10k-full.json"]) {
      const extracted = loadFixture(fixture);
      expect(emitterSatisfiesAssertion(runHealthcareRouter(extracted).results, "payor-mix").satisfied).toBe(true);
    }
  });

  it("emitPayorMixDisaggregation rejects missing required payor classes", () => {
    const extracted = loadFixture("payor-mix/reject-payor-mix-incomplete.json");
    expect(() => emitPayorMixDisaggregation(buildUsgaapAsc606EmitterInput(extracted))).toThrow();
  });
});
