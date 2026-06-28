import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/ifrs/pocMethodDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["B14", "B19", "124"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitPocMethodDisclosure(input: ConstructionEmitterInput): EmitterResult {
  const hasSignal =
    /ifrs 15|over time|input method|percentage of completion|contract revenue/i.test(
      input.narrativeHaystack,
    ) || input.extracted.framework === "ifrs";

  if (!hasSignal) {
    return {
      emitterId: "poc-method-declared",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No IFRS 15 over-time input method signals",
    };
  }

  return {
    emitterId: "poc-method-declared",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "poc-method-declared",
        citation: CITATION,
        text: `Contract revenue recognized over time using an input method per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
