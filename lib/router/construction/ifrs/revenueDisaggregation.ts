import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/ifrs/revenueDisaggregation.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["114", "B87", "B88", "B89"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitRevenueDisaggregation(input: ConstructionEmitterInput): EmitterResult {
  const hasSignal = /ifrs 15|contract revenue|construction/i.test(input.narrativeHaystack);

  if (!hasSignal) {
    return {
      emitterId: "revenue-disaggregation",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No IFRS 15 revenue disaggregation anchors",
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
        text: `Construction revenue disaggregated by project type, geography, and timing per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
