import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsSaasOutputNonComingling } from "../forbidden";
import { hasRemainingPerformanceObligation, type SaasEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/saas/ifrs/remainingPerformanceObligation.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["120", "121", "122"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitRemainingPerformanceObligation(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasRemainingPerformanceObligation(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.remaining_performance_obligation");
  }

  const rpo = extracted.contract_revenue!.remaining_performance_obligation!;
  const text = `Remaining performance obligations of EUR ${rpo.total}, including EUR ${rpo.within_twelve_months} within twelve months, per ${CITATION_RESOLVED}.`;
  assertIfrsSaasOutputNonComingling(text);

  return {
    emitterId: "remaining-performance-obligation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "rpo-disclosure", citation: CITATION, text }],
  };
}
