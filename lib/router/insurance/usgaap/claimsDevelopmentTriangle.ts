import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasDevelopmentTriangle, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/usgaap/claimsDevelopmentTriangle.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 944",
  paragraphs: ["944-40-55-12", "944-40-55-15"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitClaimsDevelopmentTriangle(input: InsuranceEmitterInput): EmitterResult {
  if (!input.insurance.hasShortDurationContracts || !hasDevelopmentTriangle(input.insurance)) {
    throw new MissingDisclosureInputError("insurance.lossReserves.developmentTriangle");
  }
  const years = Object.keys(input.insurance.lossReserves!.developmentTriangle!);
  const text = `Claims development triangle disclosed for accident years ${years.join(", ")} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "claims-development-triangle",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "claims-development-triangle", citation: CITATION, text }],
  };
}
