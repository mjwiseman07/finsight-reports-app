import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/ifrs/inputMeasureJustification.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["B18"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitInputMeasureJustification(input: ConstructionEmitterInput): EmitterResult {
  const hasSignal =
    /cost incurred|estimated total cost|percent complete|cost-?to-?cost|ifrs 15/i.test(
      input.narrativeHaystack,
    ) || input.extracted.framework === "ifrs";

  if (!hasSignal) {
    return {
      emitterId: "cost-to-cost-ratio",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No IFRS 15 input measure justification signals",
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
        text: `Progress measured using costs incurred relative to estimated total costs per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
