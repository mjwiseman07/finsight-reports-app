import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasIfrs17Input, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/ifrs/bbaInitialMeasurement.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 17",
  paragraphs: ["17.32", "17.38", "17.40"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitBbaInitialMeasurement(input: InsuranceEmitterInput): EmitterResult {
  if (!hasIfrs17Input(input.insurance) || input.insurance.ifrs17!.paaEligible) {
    throw new MissingDisclosureInputError("ifrs17.bba.initial");
  }
  if (input.insurance.ifrs17!.hasDirectParticipatingFeatures) {
    throw new MissingDisclosureInputError("ifrs17.bba.not-vfa");
  }
  const text = `IFRS 17 BBA initial measurement: fulfilment cash flows, risk adjustment, and CSM established per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "bba-initial-measurement",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "bba-initial-measurement", citation: CITATION, text }],
  };
}
