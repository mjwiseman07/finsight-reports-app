import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/usgaap/expenseRatioDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 946",
  paragraphs: ["946-205-50-15"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitExpenseRatioDisclosure(input: FundAccountingEmitterInput): EmitterResult {
  const hasSignal =
    /expense ratio|operating expenses|average net assets/i.test(input.narrativeHaystack) ||
    input.isNcsrOrNq ||
    input.extracted.vertical === "fa";

  if (!hasSignal) {
    return {
      emitterId: "expense-ratio",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No expense ratio disclosure anchors",
    };
  }

  return {
    emitterId: "expense-ratio",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "expense-ratio",
        citation: CITATION,
        text: `Expense ratio (operating expenses to average net assets) disclosed per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
