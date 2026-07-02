import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasReinsuranceInput, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/usgaap/reinsuranceRecoverable.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 326",
  paragraphs: ["944-20-50-1", "326 narrow scope reinsurance recoverables"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitReinsuranceRecoverable(input: InsuranceEmitterInput): EmitterResult {
  if (!hasReinsuranceInput(input.insurance)) {
    throw new MissingDisclosureInputError("insurance.reinsuranceRecoverable");
  }
  const rr = input.insurance.reinsuranceRecoverable!;
  const text = `Reinsurance recoverable gross $${rr.grossRecoverable.toLocaleString()} with credit allowance $${rr.creditAllowance.toLocaleString()} (ASC 326 narrow scope — recoverables only) at ${(input.insurance.cessionPercentage * 100).toFixed(1)}% cession per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "reinsurance-recoverable",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "reinsurance-recoverable", citation: CITATION, text }],
  };
}
