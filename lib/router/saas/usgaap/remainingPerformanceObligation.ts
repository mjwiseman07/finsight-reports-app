import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapSaasOutputNonComingling } from "../forbidden";
import { hasRemainingPerformanceObligation, type SaasEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/saas/usgaap/remainingPerformanceObligation.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-50-13", "606-10-50-14"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitRemainingPerformanceObligation(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasRemainingPerformanceObligation(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.remaining_performance_obligation");
  }

  const rpo = extracted.contract_revenue!.remaining_performance_obligation!;
  const text = `Remaining performance obligations of $${rpo.total}, including $${rpo.within_twelve_months} expected within twelve months, per ${CITATION_RESOLVED}.`;
  assertUsgaapSaasOutputNonComingling(text);

  return {
    emitterId: "remaining-performance-obligation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "rpo-disclosure", citation: CITATION, text }],
  };
}
