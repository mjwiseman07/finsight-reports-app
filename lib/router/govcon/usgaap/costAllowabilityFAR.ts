import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapGovconOutputNonComingling } from "../forbidden";
import { hasUnallowableCosts, type GovconEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/govcon/usgaap/costAllowabilityFAR.ts";

const CITATION: EmitterCitation = {
  standard: "FAR 31.205",
  paragraphs: ["31.205-1", "31.205-14 entertainment", "31.205-22 lobbying", "31.205-52 alcohol"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitCostAllowabilityFAR(input: GovconEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasUnallowableCosts(extracted)) {
    throw new MissingDisclosureInputError("unallowable_costs");
  }

  const costs = extracted.govcon!.unallowable_costs!;
  const categories = costs.identified_categories.join(", ");
  const text = `Unallowable cost categories (${categories}) excluded using ${costs.exclusion_methodology} per ${CITATION_RESOLVED}.`;
  assertUsgaapGovconOutputNonComingling(text);

  return {
    emitterId: "cost-allowability-far",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "far-cas-allocation", citation: CITATION, text }],
  };
}
