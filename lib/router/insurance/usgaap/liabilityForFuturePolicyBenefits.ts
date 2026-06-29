import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertLongDurationForLdtiEmitter } from "../forbidden";
import { hasLongDurationInput, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/usgaap/liabilityForFuturePolicyBenefits.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 944",
  paragraphs: ["944-40-25-1", "944-40-55-1", "ASU 2018-12 LDTI"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitLiabilityForFuturePolicyBenefits(input: InsuranceEmitterInput): EmitterResult {
  if (!hasLongDurationInput(input.insurance)) {
    throw new MissingDisclosureInputError("insurance.longDuration");
  }
  assertLongDurationForLdtiEmitter(input.insurance, "liabilityForFuturePolicyBenefits");
  const ld = input.insurance.longDuration!;
  const text = `Liability for future policy benefits $${ld.liabilityForFuturePolicyBenefits.toLocaleString()} under LDTI (ldtiApplicabilityFlag ${input.insurance.ldtiApplicabilityFlag}) per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "liability-for-future-policy-benefits",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "liability-for-future-policy-benefits", citation: CITATION, text }],
  };
}
