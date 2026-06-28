import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapNpoOutputNonComingling } from "../forbidden";
import { hasPart9Part10CrossTie, hasRequiredFunctionExpenses, type NonprofitEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/nonprofit/usgaap/functionalExpenseAllocation.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 958",
  paragraphs: ["958-720-45-2", "958-205-45-6"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitFunctionalExpenseAllocation(input: NonprofitEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasRequiredFunctionExpenses(extracted)) {
    throw new MissingDisclosureInputError("expenses.by_function");
  }
  if (!extracted.expenses?.by_nature) {
    throw new MissingDisclosureInputError("expenses.by_nature");
  }
  if (!extracted.expenses?.allocation_basis) {
    throw new MissingDisclosureInputError("expenses.allocation_basis");
  }

  const fn = extracted.expenses.by_function!;
  const text = `Program, management and general, and fundraising expense matrix disclosed per ${CITATION_RESOLVED} using ${extracted.expenses.allocation_basis}.`;
  assertUsgaapNpoOutputNonComingling(text);

  const lines = [
    {
      assertionId: "functional-expense-allocation",
      citation: CITATION,
      text,
    },
  ];

  if (hasPart9Part10CrossTie(extracted)) {
    lines.push({
      assertionId: "part9-part10-cross-tie",
      citation: CITATION,
      text: `Form 990 Part IX functional expenses tie to Part X balance sheet totals per ${CITATION_RESOLVED}.`,
    });
  }

  return {
    emitterId: "functional-expense-allocation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines,
  };
}
