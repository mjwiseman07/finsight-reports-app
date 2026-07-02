import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasIfrs17Input, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/ifrs/paaMeasurement.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 17",
  paragraphs: ["17.53", "17.55"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitPaaMeasurement(input: InsuranceEmitterInput): EmitterResult {
  if (!hasIfrs17Input(input.insurance) || !input.insurance.ifrs17!.paaEligible) {
    throw new MissingDisclosureInputError("ifrs17.paa");
  }
  const rationale = input.insurance.ifrs17!.paaEligibilityRationale ?? "";
  const text = `IFRS 17 premium allocation approach applied (${rationale}) per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "paa-measurement",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "paa-measurement", citation: CITATION, text }],
  };
}
