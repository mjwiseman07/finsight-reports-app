import {
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIpsasNpoOutputNonComingling } from "../forbidden";
import { hasRequiredFunctionExpenses, hasRequiredNatureExpenses, type NonprofitEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/nonprofit/ipsas/functionalExpenseDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IPSAS 1",
  paragraphs: ["1.105", "1.106"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);

export function emitFunctionalExpenseDisclosure(input: NonprofitEmitterInput): EmitterResult {
  if (!hasRequiredFunctionExpenses(input.extracted)) {
    throw new MissingDisclosureInputError("expenses.by_function");
  }
  if (!hasRequiredNatureExpenses(input.extracted)) {
    throw new MissingDisclosureInputError("expenses.by_nature");
  }

  const text = `Expense analysis by function and by nature disclosed per ${CITATION_RESOLVED}.`;
  assertIpsasNpoOutputNonComingling(text);

  return {
    emitterId: "functional-expense-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "functional-expense-allocation",
        citation: CITATION,
        text,
      },
      {
        assertionId: "natural-expense-disclosure",
        citation: CITATION,
        text: `Natural expense classification disclosed alongside functional analysis per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
