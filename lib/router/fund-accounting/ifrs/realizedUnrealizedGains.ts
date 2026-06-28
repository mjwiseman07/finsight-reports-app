import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/ifrs/realizedUnrealizedGains.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 9",
  paragraphs: ["5.7", "IAS 1.82"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitRealizedUnrealizedGains(input: FundAccountingEmitterInput): EmitterResult {
  const hasSignal =
    /realized|unrealized|fvtpl|gain|loss/i.test(input.narrativeHaystack) ||
    input.extracted.framework === "ifrs";

  if (!hasSignal) {
    return {
      emitterId: "realized-unrealized-gains",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No IFRS gain/loss split anchors",
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
        text: `Gains and losses on FVTPL instruments presented per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
