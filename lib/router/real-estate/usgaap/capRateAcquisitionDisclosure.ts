import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasAcquisitionInput, type RealEstateEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/real-estate/usgaap/capRateAcquisitionDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 805",
  paragraphs: ["805-20-50-1", "805-30-50-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitCapRateAcquisitionDisclosure(input: RealEstateEmitterInput): EmitterResult {
  if (!hasAcquisitionInput(input.extracted)) {
    throw new MissingDisclosureInputError("real_estate.acquisition");
  }
  const a = input.extracted.real_estate!.acquisition!;
  const text =
    `Acquisition of ${a.property_name}: purchase price $${a.amount.toLocaleString()}, ` +
    `cap rate ${a.cap_rate_pct.toLocaleString()}% per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "cap-rate-acquisition-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "cap-rate-acquisition-disclosure", citation: CITATION, text }],
  };
}
