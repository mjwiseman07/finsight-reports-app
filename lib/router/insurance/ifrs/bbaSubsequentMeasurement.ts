import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasIfrs17Input, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/ifrs/bbaSubsequentMeasurement.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 17",
  paragraphs: ["17.40", "17.44", "17.45"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitBbaSubsequentMeasurement(input: InsuranceEmitterInput): EmitterResult {
  if (!hasIfrs17Input(input.insurance) || input.insurance.ifrs17!.paaEligible) {
    throw new MissingDisclosureInputError("ifrs17.bba.subsequent");
  }
  if (input.insurance.ifrs17!.hasDirectParticipatingFeatures) {
    throw new MissingDisclosureInputError("ifrs17.bba.not-vfa");
  }
  const text = `IFRS 17 BBA subsequent measurement roll-forward of CSM and liability for remaining coverage per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "bba-subsequent-measurement",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "bba-subsequent-measurement", citation: CITATION, text }],
  };
}
