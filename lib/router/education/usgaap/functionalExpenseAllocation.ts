import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasFunctionalExpenseInput, type EducationEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/education/usgaap/functionalExpenseAllocation.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 958",
  paragraphs: ["958-205-45-6", "958-720-45-2"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitFunctionalExpenseAllocation(input: EducationEmitterInput): EmitterResult {
  if (!hasFunctionalExpenseInput(input.extracted)) {
    throw new MissingDisclosureInputError("expenses.by_function");
  }
  const fn = input.extracted.expenses!.by_function!;
  const text = `Functional expense allocation (instruction $${fn.program.toLocaleString()}, support $${fn.management_general.toLocaleString()}) per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "functional-expense-allocation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "functional-expense-allocation", citation: CITATION, text }],
  };
}
