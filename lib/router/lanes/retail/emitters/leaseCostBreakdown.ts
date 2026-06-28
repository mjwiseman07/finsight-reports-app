import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../types";
import { LeaseCostIncompleteError } from "../errors";
import { assertUsgaapRtlLeaseOutputNonComingling } from "../forbidden";
import {
  FOOTING_TOLERANCE_USD,
  US_GAAP_ASC842,
  type RetailLeaseEmitterInput,
} from "../types";

export const EMITTER_PATH = "lib/router/lanes/retail/emitters/leaseCostBreakdown.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 842",
  paragraphs: ["842-20-50-4(a)", "842-20-50-4(b)", "842-20-50-4(c)"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

function assertFramework(input: RetailLeaseEmitterInput): void {
  if (input.framework !== US_GAAP_ASC842) {
    throw new LeaseCostIncompleteError("framework gate");
  }
}

export function emitLeaseCostBreakdown(input: RetailLeaseEmitterInput): EmitterResult {
  assertFramework(input);
  const breakdown = input.extracted.leases?.asc842?.cost_breakdown;
  if (!breakdown) {
    throw new LeaseCostIncompleteError("leases.asc842.cost_breakdown");
  }

  const required = [
    "operating_lease_cost",
    "variable_lease_cost",
    "short_term_lease_cost",
    "total_lease_cost",
  ] as const;
  for (const field of required) {
    if (breakdown[field] === undefined || breakdown[field] === null) {
      throw new LeaseCostIncompleteError(`leases.asc842.cost_breakdown.${field}`);
    }
  }

  const subleaseIncome = breakdown.sublease_income ?? 0;
  const computedTotal =
    breakdown.operating_lease_cost +
    breakdown.variable_lease_cost +
    breakdown.short_term_lease_cost -
    subleaseIncome;
  if (Math.abs(computedTotal - breakdown.total_lease_cost) > FOOTING_TOLERANCE_USD) {
    throw new LeaseCostIncompleteError("total lease cost footing");
  }

  const subleaseLine =
    subleaseIncome !== 0
      ? ` Sublease income: $${subleaseIncome.toLocaleString("en-US")}.`
      : "";
  const text =
    `ASC 842 lessee lease cost: operating lease cost $${breakdown.operating_lease_cost.toLocaleString("en-US")}; ` +
    `variable lease cost $${breakdown.variable_lease_cost.toLocaleString("en-US")}; ` +
    `short-term lease cost $${breakdown.short_term_lease_cost.toLocaleString("en-US")};` +
    `${subleaseLine} Total lease cost $${breakdown.total_lease_cost.toLocaleString("en-US")} per ${CITATION_RESOLVED}.`;
  assertUsgaapRtlLeaseOutputNonComingling(text);

  return {
    emitterId: "lease-cost-breakdown",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "lease-obligations", citation: CITATION, text }],
  };
}
