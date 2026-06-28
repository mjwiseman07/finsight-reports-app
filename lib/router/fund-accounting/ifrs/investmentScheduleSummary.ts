import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/ifrs/investmentScheduleSummary.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 12",
  paragraphs: ["B16", "B17", "B18", "IFRS 7.34"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitInvestmentScheduleSummary(input: FundAccountingEmitterInput): EmitterResult {
  const hasSignal =
    /portfolio|investments|interests in other entities/i.test(input.narrativeHaystack) ||
    input.extracted.framework === "ifrs";

  if (!hasSignal) {
    return {
      emitterId: "portfolio-composition",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No IFRS investment schedule anchors",
    };
  }

  return {
    emitterId: "portfolio-composition",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "portfolio-composition",
        citation: CITATION,
        text: `Interests in other entities and financial instrument concentrations per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
