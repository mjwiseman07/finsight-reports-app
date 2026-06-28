import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/usgaap/realizedUnrealizedGains.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 946",
  paragraphs: ["946-225-45-5"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitRealizedUnrealizedGains(input: FundAccountingEmitterInput): EmitterResult {
  const hasSignal =
    /realized gain|unrealized gain|change in unrealized/i.test(input.narrativeHaystack) ||
    input.isNcsrOrNq ||
    input.extracted.vertical === "fa";

  if (!hasSignal) {
    return {
      emitterId: "realized-unrealized-gains",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No realized/unrealized gain split anchors",
    };
  }

  return {
    emitterId: "realized-unrealized-gains",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "realized-unrealized-gains",
        citation: CITATION,
        text: `Statement of operations separates realized and unrealized gains and losses per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
