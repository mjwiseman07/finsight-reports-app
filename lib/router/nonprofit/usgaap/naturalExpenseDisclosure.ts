import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapNpoOutputNonComingling } from "../forbidden";
import { hasRequiredNatureExpenses, type NonprofitEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/nonprofit/usgaap/naturalExpenseDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 958",
  paragraphs: ["958-720-45-15"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitNaturalExpenseDisclosure(input: NonprofitEmitterInput): EmitterResult {
  if (!hasRequiredNatureExpenses(input.extracted)) {
    throw new MissingDisclosureInputError("expenses.by_nature");
  }

  const text = `Natural expense classification (salaries, occupancy, depreciation, professional fees) disclosed per ${CITATION_RESOLVED}.`;
  assertUsgaapNpoOutputNonComingling(text);

  return {
    emitterId: "natural-expense-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "natural-expense-disclosure",
        citation: CITATION,
        text,
      },
    ],
  };
}
