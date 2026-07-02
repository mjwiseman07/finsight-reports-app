/**
 * ASC 326-20 — off-balance-sheet credit exposure (OBS commitments).
 * SEPARATE from AFS 326-30 impairment model.
 */
import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/usgaap/cecl-obs-commitments.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 326",
  paragraphs: ["326-20-30-11", "326-20-55-19"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitCeclObsCommitments(input: BankingEmitterInput): EmitterResult {
  const b = input.banking;
  if (b.obsCommitments <= 0) {
    throw new MissingDisclosureInputError("banking.obsCommitments");
  }
  const text = `[${scopeQualifier(b)}] OBS commitments CECL reserve on $${b.obsCommitments.toLocaleString()} undrawn commitments and $${b.obsFinancialGuarantees.toLocaleString()} financial guarantees per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "cecl-obs-commitments",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "cecl-obs-commitments", citation: CITATION, text }],
  };
}
