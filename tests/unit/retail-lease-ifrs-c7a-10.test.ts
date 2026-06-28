import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  collectForbiddenMatches,
  IFRS_RTL_LEASE_FORBIDDEN_OUTPUT_SUBSTRINGS,
  USGAAP_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../lib/router/lanes/retail/forbidden";
import {
  IFRS16ExpenseIncompleteError,
  IFRS16MaturityIncompleteError,
  IFRS16RoURollforwardError,
} from "../../lib/router/lanes/retail/errors";
import { emitLeaseExpenseBreakdown } from "../../lib/router/lanes/retail/emitters/ifrs/leaseExpenseBreakdown";
import { emitLeaseMaturityIFRS } from "../../lib/router/lanes/retail/emitters/ifrs/leaseMaturityIFRS";
import { emitRouAssetRollforward } from "../../lib/router/lanes/retail/emitters/ifrs/rouAssetRollforward";
import { buildRetailIfrs16LeaseEmitterInput } from "../../lib/router/lanes/retail/types";
import {
  emitterSatisfiesAssertion,
  ifrsRetailLeaseOutputText,
  runRetailRouter,
  usgaapRetailLeaseOutputText,
} from "../../lib/router/retail";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/retail");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("retail C7a-10 IFRS 16 lessee lease disclosures", () => {
  it("leaseExpenseBreakdown happy AD-annual separates short-term and low-value", () => {
    const extracted = loadFixture("leases/ifrs/leaseExpenseBreakdown/happy-ad-annual.json");
    const output = ifrsRetailLeaseOutputText(extracted);
    expect(collectForbiddenMatches(output, IFRS_RTL_LEASE_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/short-term lease expense/i);
    expect(output).toMatch(/low-value asset lease expense/i);
    expect(output).toMatch(/IFRS 16/);
    expect(emitterSatisfiesAssertion(runRetailRouter(extracted).results, "lease-obligations").satisfied).toBe(
      true,
    );
  });

  it("leaseMaturityIFRS happy TSCO-annual uses IFRS 7 time bands not US GAAP Thereafter", () => {
    const extracted = loadFixture("leases/ifrs/leaseMaturityIFRS/happy-tsco-annual.json");
    const output = ifrsRetailLeaseOutputText(extracted);
    expect(collectForbiddenMatches(output, IFRS_RTL_LEASE_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/≤1yr/);
    expect(output).toMatch(/>5yr/);
    expect(output.includes("Thereafter")).toBe(false);
    expect(output).toMatch(/incremental borrowing rate 4\.15%/);
  });

  it("rouAssetRollforward happy TSCO-annual reconciles closing to balance sheet", () => {
    const extracted = loadFixture("leases/ifrs/rouAssetRollforward/happy-tsco-annual.json");
    const output = ifrsRetailLeaseOutputText(extracted);
    expect(collectForbiddenMatches(output, IFRS_RTL_LEASE_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/Superstores/);
    expect(output).toMatch(/Distribution properties/);
    expect(output).toMatch(/reconciled to balance sheet/i);
  });

  it("leaseExpenseBreakdown fail-closed throws IFRS16ExpenseIncompleteError on missing low-value", () => {
    const extracted = loadFixture("leases/ifrs/leaseExpenseBreakdown/fail-closed-missing-low-value.json");
    expect(() => emitLeaseExpenseBreakdown(buildRetailIfrs16LeaseEmitterInput(extracted))).toThrow(
      IFRS16ExpenseIncompleteError,
    );
  });

  it("leaseExpenseBreakdown rejects collapsed short-term and low-value amounts", () => {
    const extracted = loadFixture("leases/ifrs/leaseExpenseBreakdown/reject-collapsed-short-term-low-value.json");
    expect(() => emitLeaseExpenseBreakdown(buildRetailIfrs16LeaseEmitterInput(extracted))).toThrow(
      IFRS16ExpenseIncompleteError,
    );
  });

  it("leaseMaturityIFRS fail-closed throws on footing mismatch", () => {
    const extracted = loadFixture("leases/ifrs/leaseMaturityIFRS/fail-closed-footing-mismatch.json");
    expect(() => emitLeaseMaturityIFRS(buildRetailIfrs16LeaseEmitterInput(extracted))).toThrow(
      IFRS16MaturityIncompleteError,
    );
  });

  it("rouAssetRollforward fail-closed throws on single lumped class", () => {
    const extracted = loadFixture("leases/ifrs/rouAssetRollforward/fail-closed-single-class.json");
    expect(() => emitRouAssetRollforward(buildRetailIfrs16LeaseEmitterInput(extracted))).toThrow(
      IFRS16RoURollforwardError,
    );
  });

  it("US GAAP framework rejects IFRS 16 lease expense emitter", () => {
    const extracted = loadFixture("leases/ifrs/leaseExpenseBreakdown/framework-rejection-us-gaap.json");
    const router = runRetailRouter(extracted);
    expect(router.frameworkViolation?.citation).toBe("ASC 842");
    expect(router.results.length).toBe(0);
  });

  it("US GAAP framework rejects IFRS 16 maturity emitter", () => {
    const extracted = loadFixture("leases/ifrs/leaseMaturityIFRS/framework-rejection-us-gaap.json");
    const router = runRetailRouter(extracted);
    expect(router.frameworkViolation?.citation).toBe("ASC 842");
  });

  it("US GAAP framework rejects IFRS 16 RoU rollforward emitter", () => {
    const extracted = loadFixture("leases/ifrs/rouAssetRollforward/framework-rejection-us-gaap.json");
    const router = runRetailRouter(extracted);
    expect(router.frameworkViolation?.citation).toBe("ASC 842");
  });

  it("cross-cutting TSCO-AR-LEASE: IFRS full suite is framework-pure", () => {
    const extracted = loadFixture("cross-cutting/TSCO-AR-LEASE.json");
    const ifrsOutput = ifrsRetailLeaseOutputText(extracted);
    expect(collectForbiddenMatches(ifrsOutput, IFRS_RTL_LEASE_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(ifrsOutput).toMatch(/depreciation of right-of-use assets/i);
    expect(ifrsOutput).toMatch(/maturity analysis/i);
    expect(ifrsOutput).toMatch(/right-of-use asset rollforward/i);
    const router = runRetailRouter(extracted);
    expect(router.results.filter((r) => r.status === "satisfied").length).toBe(3);
  });

  it("cross-cutting framework-switch: TGT US GAAP vs TSCO IFRS both framework-pure", () => {
    const tgt = loadFixture("cross-cutting/TGT-10K-LEASE.json");
    const tsco = loadFixture("cross-cutting/TSCO-AR-LEASE.json");
    const usOutput = usgaapRetailLeaseOutputText(tgt);
    const ifrsOutput = ifrsRetailLeaseOutputText(tsco);
    expect(collectForbiddenMatches(usOutput, USGAAP_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(collectForbiddenMatches(ifrsOutput, IFRS_RTL_LEASE_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(usOutput).toMatch(/ASC 842/);
    expect(ifrsOutput).toMatch(/IFRS 16/);
  });

  it("IFRS emitters branch on IFRS_16 framework gate", () => {
    const paths = [
      "lib/router/lanes/retail/emitters/ifrs/leaseExpenseBreakdown.ts",
      "lib/router/lanes/retail/emitters/ifrs/leaseMaturityIFRS.ts",
      "lib/router/lanes/retail/emitters/ifrs/rouAssetRollforward.ts",
    ];
    for (const rel of paths) {
      const source = readFileSync(join(import.meta.dirname, "../..", rel), "utf8");
      expect(source).toMatch(/IFRS_16/);
      expect(source).not.toMatch(/operating.*finance.*classification/i);
    }
  });
});
