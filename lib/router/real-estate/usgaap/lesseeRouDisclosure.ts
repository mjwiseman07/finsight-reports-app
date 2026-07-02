import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasLesseeInput, type RealEstateEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/real-estate/usgaap/lesseeRouDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 842",
  paragraphs: ["842-20-45-1", "842-20-50-4"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitLesseeRouDisclosure(input: RealEstateEmitterInput): EmitterResult {
  if (!hasLesseeInput(input.extracted)) {
    throw new MissingDisclosureInputError("real_estate.lessee");
  }
  const l = input.extracted.real_estate!.lessee!;
  const text =
    `Lessee ROU asset $${l.rou_asset.toLocaleString()} and lease liability $${l.lease_liability.toLocaleString()} ` +
    `recognized at commencement per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "lessee-rou-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "lessee-rou-disclosure", citation: CITATION, text }],
  };
}
