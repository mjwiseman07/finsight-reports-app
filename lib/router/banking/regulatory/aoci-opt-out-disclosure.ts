import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/regulatory/aoci-opt-out-disclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 825",
  paragraphs: ["825-10-45-4", "AOCI opt-out election"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitAociOptOutDisclosure(input: BankingEmitterInput): EmitterResult {
  if (!input.banking.aociOptOutElection) {
    throw new MissingDisclosureInputError("banking.aociOptOutElection");
  }
  const text = `[${scopeQualifier(input.banking)}] AOCI opt-out election elected for eligible community bank (total assets $${input.banking.totalAssets.toLocaleString()}) per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "aoci-opt-out-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "aoci-opt-out-disclosure", citation: CITATION, text }],
  };
}
