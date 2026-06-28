import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/usgaap/investmentScheduleSummary.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 946",
  paragraphs: ["946-210-45-4"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitInvestmentScheduleSummary(input: FundAccountingEmitterInput): EmitterResult {
  const hasSignal =
    /portfolio|asset class|equity|fixed income|schedule of investments/i.test(input.narrativeHaystack) ||
    input.isNcsrOrNq ||
    input.extracted.vertical === "fa";

  if (!hasSignal) {
    return {
      emitterId: "portfolio-composition",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No investment company schedule anchors",
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
        text: `Schedule of investments summarizes portfolio composition by industry, country, and issuer per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
