import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasImpairmentInput, type RealEstateEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/real-estate/usgaap/impairmentHeldAndUsed.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 360",
  paragraphs: ["360-10-35-21", "360-10-35-24"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitImpairmentHeldAndUsed(input: RealEstateEmitterInput): EmitterResult {
  if (!hasImpairmentInput(input.extracted)) {
    throw new MissingDisclosureInputError("real_estate.impairment");
  }
  const i = input.extracted.real_estate!.impairment!;
  const text =
    `Held-and-used impairment for ${i.asset_group}: carrying amount $${i.carrying_amount.toLocaleString()}, ` +
    `fair value $${i.fair_value.toLocaleString()} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "impairment-held-and-used",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "impairment-held-and-used", citation: CITATION, text }],
  };
}
