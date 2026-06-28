import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../../types";
import { IfrsPayorMixIncompleteError, IfrsUsPayorCominglingError } from "../../errors";
import { assertIfrsHcRevenueOutputNonComingling } from "../../forbidden";
import {
  HC_FOOTING_TOLERANCE_USD,
  IFRS_15,
  US_PAYOR_FORBIDDEN_IN_IFRS,
  type HealthcareRevenueEmitterInput,
} from "../../types";

export const EMITTER_PATH = "lib/router/lanes/healthcare/emitters/ifrs/payorMixIFRS.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["114", "115"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

function assertFramework(input: HealthcareRevenueEmitterInput): void {
  if (input.framework !== IFRS_15) {
    throw new IfrsPayorMixIncompleteError("framework gate");
  }
}

export function emitPayorMixIFRS(input: HealthcareRevenueEmitterInput): EmitterResult {
  assertFramework(input);
  const mix = input.extracted.healthcare_revenue?.ifrs?.payor_mix;
  if (!mix?.payors?.length) {
    throw new IfrsPayorMixIncompleteError("healthcare_revenue.ifrs.payor_mix");
  }

  let sum = 0;
  const rows: string[] = [];
  for (const payor of mix.payors) {
    const lower = payor.class.toLowerCase();
    for (const forbidden of US_PAYOR_FORBIDDEN_IN_IFRS) {
      if (lower.includes(forbidden)) {
        throw new IfrsUsPayorCominglingError(forbidden);
      }
    }
    sum += payor.revenue;
    rows.push(`${payor.class}: ${payor.revenue.toLocaleString("en-US")}`);
  }

  if (Math.abs(sum - mix.total_revenue) > HC_FOOTING_TOLERANCE_USD) {
    throw new IfrsPayorMixIncompleteError("IFRS payor mix footing");
  }

  const text =
    `Revenue disaggregated by payor class per ${CITATION_RESOLVED}: ${rows.join("; ")}. ` +
    `Total revenue ${mix.total_revenue.toLocaleString("en-US")}.`;
  assertIfrsHcRevenueOutputNonComingling(text);

  return {
    emitterId: "payor-mix-ifrs",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "payor-mix", citation: CITATION, text }],
  };
}
