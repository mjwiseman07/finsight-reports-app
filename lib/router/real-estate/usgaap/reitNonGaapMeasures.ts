import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasReitMetricsInput, type RealEstateEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/real-estate/usgaap/reitNonGaapMeasures.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 970",
  paragraphs: ["970-323-50-1", "970-323-50-2"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitReitNonGaapMeasures(input: RealEstateEmitterInput): EmitterResult {
  if (!hasReitMetricsInput(input.extracted)) {
    throw new MissingDisclosureInputError("real_estate.reit_metrics");
  }
  const r = input.extracted.real_estate!.reit_metrics!;
  const text =
    `REIT non-GAAP measures: FFO $${r.ffo.toLocaleString()}, AFFO $${r.affo.toLocaleString()}, ` +
    `NOI $${r.noi.toLocaleString()} reconciled per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "reit-non-gaap-measures",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "reit-non-gaap-measures", citation: CITATION, text }],
  };
}
