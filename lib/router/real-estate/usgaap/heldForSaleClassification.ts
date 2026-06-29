import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasHeldForSaleInput, type RealEstateEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/real-estate/usgaap/heldForSaleClassification.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 360",
  paragraphs: ["360-10-45-9", "360-10-45-10"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitHeldForSaleClassification(input: RealEstateEmitterInput): EmitterResult {
  if (!hasHeldForSaleInput(input.extracted)) {
    throw new MissingDisclosureInputError("real_estate.held_for_sale");
  }
  const h = input.extracted.real_estate!.held_for_sale!;
  const text =
    `Assets held for sale $${h.assets.toLocaleString()} and associated liabilities $${h.liabilities.toLocaleString()} ` +
    `classified per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "held-for-sale-classification",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "held-for-sale-classification", citation: CITATION, text }],
  };
}
