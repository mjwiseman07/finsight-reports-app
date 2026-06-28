import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/usgaap/navPerShareRollforward.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 946",
  paragraphs: ["946-205-45-1", "946-205-50-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitNavPerShareRollforward(input: FundAccountingEmitterInput): EmitterResult {
  const hasSignal =
    (input.hasNetAssets && input.hasShares) ||
    input.hasNavNarrative ||
    input.isNcsrOrNq ||
    input.extracted.vertical === "fa";

  if (!hasSignal) {
    return {
      emitterId: "nav-computation",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No NAV rollforward anchors in filing corpus",
    };
  }

  return {
    emitterId: "nav-computation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "nav-computation",
        citation: CITATION,
        text: `Financial highlights table presents net asset value per share rollforward per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
