import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling } from "../../scripts/external-truth/types";
import {
  collectForbiddenMatches,
  USGAAP_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS,
} from "../../lib/router/lanes/retail/forbidden";
import { LeaseCostIncompleteError } from "../../lib/router/lanes/retail/errors";
import { emitLeaseCostBreakdown } from "../../lib/router/lanes/retail/emitters/leaseCostBreakdown";
import { emitLeaseWeightedAverages } from "../../lib/router/lanes/retail/emitters/leaseWeightedAverages";
import { emitLeaseMaturityReconciliation } from "../../lib/router/lanes/retail/emitters/leaseMaturityReconciliation";
import { buildRetailLeaseEmitterInput } from "../../lib/router/lanes/retail/types";
import {
  emitterSatisfiesAssertion,
  runRetailRouter,
  usgaapRetailLeaseOutputText,
} from "../../lib/router/retail";

const FIXTURE_ROOT = join(import.meta.dirname, "../fixtures/retail");

function loadFixture(relPath: string): ExtractedFiling {
  const raw = JSON.parse(readFileSync(join(FIXTURE_ROOT, relPath), "utf8")) as { extracted: ExtractedFiling };
  return raw.extracted;
}

describe("retail C7a-9 ASC 842 lease disclosures", () => {
  it("leaseCostBreakdown happy COST-10k satisfies lease-obligations with framework-pure output", () => {
    const extracted = loadFixture("leases/leaseCostBreakdown/happy-cost-10k.json");
    const output = usgaapRetailLeaseOutputText(extracted);
    expect(collectForbiddenMatches(output, USGAAP_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/operating lease cost/i);
    expect(output).toMatch(/ASC 842/);
    expect(emitterSatisfiesAssertion(runRetailRouter(extracted).results, "lease-obligations").satisfied).toBe(
      true,
    );
  });

  it("leaseWeightedAverages happy TGT-10k emits two-row operating/finance table", () => {
    const extracted = loadFixture("leases/leaseWeightedAverages/happy-tgt-10k.json");
    const output = usgaapRetailLeaseOutputText(extracted);
    expect(collectForbiddenMatches(output, USGAAP_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/8\.4 years at 4\.25%/);
    expect(output).toMatch(/12\.7 years at 3\.85%/);
  });

  it("leaseMaturityReconciliation happy WMT-10k reconciles PV to balance sheet within $1", () => {
    const extracted = loadFixture("leases/leaseMaturityReconciliation/happy-wmt-10k.json");
    const output = usgaapRetailLeaseOutputText(extracted);
    expect(collectForbiddenMatches(output, USGAAP_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(output).toMatch(/Operating leases/);
    expect(output).toMatch(/Finance leases/);
    expect(output).toMatch(/balance sheet operating lease liability/i);
  });

  it("leaseCostBreakdown fail-closed throws LeaseCostIncompleteError on missing operating cost", () => {
    const extracted = loadFixture("leases/leaseCostBreakdown/fail-closed-missing-operating-cost.json");
    expect(() => emitLeaseCostBreakdown(buildRetailLeaseEmitterInput(extracted))).toThrow(
      LeaseCostIncompleteError,
    );
  });

  it("leaseWeightedAverages fail-closed throws on missing finance row", () => {
    const extracted = loadFixture("leases/leaseWeightedAverages/fail-closed-missing-finance-row.json");
    expect(() => emitLeaseWeightedAverages(buildRetailLeaseEmitterInput(extracted))).toThrow();
  });

  it("leaseMaturityReconciliation fail-closed throws on missing finance schedule", () => {
    const extracted = loadFixture("leases/leaseMaturityReconciliation/fail-closed-missing-finance-schedule.json");
    expect(() => emitLeaseMaturityReconciliation(buildRetailLeaseEmitterInput(extracted))).toThrow();
  });

  it("IFRS framework rejects US GAAP lease cost emitter via router frameworkViolation", () => {
    const extracted = loadFixture("leases/leaseCostBreakdown/framework-rejection-ifrs.json");
    const router = runRetailRouter(extracted);
    expect(router.frameworkViolation?.citation).toBe("IFRS 16");
    expect(router.results.length).toBe(0);
  });

  it("IFRS framework rejects US GAAP weighted averages emitter", () => {
    const extracted = loadFixture("leases/leaseWeightedAverages/framework-rejection-ifrs.json");
    const router = runRetailRouter(extracted);
    expect(router.frameworkViolation?.citation).toBe("IFRS 16");
  });

  it("IFRS framework rejects US GAAP maturity reconciliation emitter", () => {
    const extracted = loadFixture("leases/leaseMaturityReconciliation/framework-rejection-ifrs.json");
    const router = runRetailRouter(extracted);
    expect(router.frameworkViolation?.citation).toBe("IFRS 16");
  });

  it("cross-cutting TGT-10K-LEASE: US GAAP full lease suite is framework-pure", () => {
    const extracted = loadFixture("cross-cutting/TGT-10K-LEASE.json");
    const usOutput = usgaapRetailLeaseOutputText(extracted);
    expect(collectForbiddenMatches(usOutput, USGAAP_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS)).toEqual([]);
    expect(usOutput).toMatch(/operating lease cost/i);
    expect(usOutput).toMatch(/weighted-average remaining lease term/i);
    expect(usOutput).toMatch(/lease maturity reconciliation/i);
    const router = runRetailRouter(extracted);
    expect(router.results.filter((r) => r.status === "satisfied").length).toBe(3);
  });
});
