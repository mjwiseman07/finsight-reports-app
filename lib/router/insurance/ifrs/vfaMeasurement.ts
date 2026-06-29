import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasIfrs17Input, vfaFullyQualified, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/ifrs/vfaMeasurement.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 17",
  paragraphs: ["17.B101", "17.B104"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitVfaMeasurement(input: InsuranceEmitterInput): EmitterResult {
  const ifrs17 = input.insurance.ifrs17;
  if (!hasIfrs17Input(input.insurance) || !ifrs17?.hasDirectParticipatingFeatures) {
    throw new MissingDisclosureInputError("ifrs17.vfa");
  }
  if (!vfaFullyQualified(input.insurance)) {
    throw new MissingDisclosureInputError("ifrs17.vfaQualification");
  }
  const text = `IFRS 17 variable fee approach for direct participating contracts (qualitative attestation on pool share, substantial share, and cash flow variability — no numeric threshold) per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "vfa-measurement",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "vfa-measurement", citation: CITATION, text }],
  };
}
