import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasIfrs17Input, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/ifrs/contractBoundaryDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 17",
  paragraphs: ["17.34", "17.35"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitContractBoundaryDisclosure(input: InsuranceEmitterInput): EmitterResult {
  if (!hasIfrs17Input(input.insurance)) {
    throw new MissingDisclosureInputError("ifrs17.contractBoundary");
  }
  const rationale = input.insurance.ifrs17!.contractBoundaryRationale ?? "contract boundary per IFRS 17.34";
  const text = `IFRS 17 contract boundary: ${rationale} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "contract-boundary-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "contract-boundary-disclosure", citation: CITATION, text }],
  };
}
