/**
 * IFRS substitute disclosure: no direct "expense ratio" equivalent.
 * Framework-bound FVTPL expense breakdown + management-fee call-out (not ASC 946 comingling).
 */
import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/ifrs/expenseRatioDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 7",
  paragraphs: ["31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "IAS 1.117"],
};

export const FRAMEWORK_SUBSTITUTE_NOTE =
  "IFRS has no direct expense-ratio metric equivalent to ASC 946-205-50-15; this emitter substitutes FVTPL expense breakdown with management-fee call-out.";

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitExpenseRatioDisclosure(input: FundAccountingEmitterInput): EmitterResult {
  const hasSignal =
    /expense|management fee|fvtpl|operating/i.test(input.narrativeHaystack) ||
    input.extracted.framework === "ifrs";

  if (!hasSignal) {
    return {
      emitterId: "expense-ratio",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No IFRS expense breakdown anchors",
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
        text: `${FRAMEWORK_SUBSTITUTE_NOTE} FVTPL expense breakdown including management fees per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
