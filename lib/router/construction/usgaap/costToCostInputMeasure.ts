import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/usgaap/costToCostInputMeasure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-55-20"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitCostToCostInputMeasure(input: ConstructionEmitterInput): EmitterResult {
  const hasSignal =
    input.hasContractRevenueTag ||
    /cost incurred|estimated total cost|percent complete|cost-?to-?cost/i.test(input.narrativeHaystack) ||
    input.extracted.vertical === "con";

  if (!hasSignal) {
    return {
      emitterId: "cost-to-cost-ratio",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No cost-to-cost input measure signals in filing corpus",
    };
  }

  return {
    emitterId: "cost-to-cost-ratio",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "cost-to-cost-ratio",
        citation: CITATION,
        text: `Progress measured using cost incurred relative to estimated total cost (cost-to-cost input measure) per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
