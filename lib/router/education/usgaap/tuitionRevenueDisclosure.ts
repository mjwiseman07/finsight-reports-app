import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasTuitionRevenueInput, type EducationEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/education/usgaap/tuitionRevenueDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-25-19", "606-10-55-91"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitTuitionRevenueDisclosure(input: EducationEmitterInput): EmitterResult {
  if (!hasTuitionRevenueInput(input.extracted)) {
    throw new MissingDisclosureInputError("education.revenue.tuition");
  }
  const tuition = input.extracted.education!.revenue!.tuition;
  const text = `Tuition and fee revenue of $${tuition.toLocaleString()} recognized over academic term performance obligations per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "tuition-revenue-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "tuition-revenue-disclosure", citation: CITATION, text }],
  };
}
