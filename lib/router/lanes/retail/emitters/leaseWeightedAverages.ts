import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../types";
import { LeaseWeightedAveragesInvalidError } from "../errors";
import { assertUsgaapRtlLeaseOutputNonComingling } from "../forbidden";
import { US_GAAP_ASC842, type RetailLeaseEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/lanes/retail/emitters/leaseWeightedAverages.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 842",
  paragraphs: ["842-20-50-4(g)(1)", "842-20-50-4(g)(2)"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

function assertFramework(input: RetailLeaseEmitterInput): void {
  if (input.framework !== US_GAAP_ASC842) {
    throw new LeaseWeightedAveragesInvalidError("framework gate");
  }
}

function validateRow(
  label: "operating" | "finance",
  remainingTermYears: number,
  discountRatePct: number,
): void {
  if (remainingTermYears <= 0 || remainingTermYears > 99) {
    throw new LeaseWeightedAveragesInvalidError(
      `${label} weighted-average remaining lease term out of band: ${remainingTermYears}`,
    );
  }
  if (discountRatePct <= 0 || discountRatePct > 25) {
    throw new LeaseWeightedAveragesInvalidError(
      `${label} weighted-average discount rate out of band: ${discountRatePct}%`,
    );
  }
}

export function emitLeaseWeightedAverages(input: RetailLeaseEmitterInput): EmitterResult {
  assertFramework(input);
  const averages = input.extracted.leases?.asc842?.weighted_averages;
  if (!averages?.operating || !averages?.finance) {
    throw new LeaseWeightedAveragesInvalidError("leases.asc842.weighted_averages");
  }

  validateRow(
    "operating",
    averages.operating.remaining_term_years,
    averages.operating.discount_rate_pct,
  );
  validateRow("finance", averages.finance.remaining_term_years, averages.finance.discount_rate_pct);

  const opTerm = averages.operating.remaining_term_years.toFixed(1);
  const opRate = averages.operating.discount_rate_pct.toFixed(2);
  const finTerm = averages.finance.remaining_term_years.toFixed(1);
  const finRate = averages.finance.discount_rate_pct.toFixed(2);
  const text =
    `ASC 842 weighted-average remaining lease term and discount rate: ` +
    `operating leases ${opTerm} years at ${opRate}%; finance leases ${finTerm} years at ${finRate}% per ${CITATION_RESOLVED}.`;
  assertUsgaapRtlLeaseOutputNonComingling(text);

  return {
    emitterId: "lease-weighted-averages",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "lease-obligations", citation: CITATION, text }],
  };
}
