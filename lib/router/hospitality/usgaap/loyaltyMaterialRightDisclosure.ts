import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasLoyaltyProgramInput, type HospitalityEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/hospitality/usgaap/loyaltyMaterialRightDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-32-27", "606-10-55-42"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitLoyaltyMaterialRightDisclosure(input: HospitalityEmitterInput): EmitterResult {
  if (!hasLoyaltyProgramInput(input.extracted)) {
    throw new MissingDisclosureInputError("hospitality.loyalty_program");
  }
  const loyalty = input.extracted.hospitality!.loyalty_program!;
  const text =
    `Loyalty program deferred revenue $${loyalty.deferred_revenue.toLocaleString()} with material right estimate ` +
    `$${loyalty.material_right_estimate.toLocaleString()} allocated per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "loyalty-material-right-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "loyalty-material-right-disclosure", citation: CITATION, text }],
  };
}
