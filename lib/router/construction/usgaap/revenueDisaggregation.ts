import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/usgaap/revenueDisaggregation.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-50-5"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitRevenueDisaggregation(input: ConstructionEmitterInput): EmitterResult {
  const hasSignal = input.hasContractRevenueTag || input.hasAssetFacts;

  if (!hasSignal) {
    return {
      emitterId: "revenue-disaggregation",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No revenue disaggregation anchors in filing corpus",
    };
  }

  return {
    emitterId: "revenue-disaggregation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "revenue-disaggregation",
        citation: CITATION,
        text: `Construction revenue disaggregated by project type, geography, and contract duration per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
