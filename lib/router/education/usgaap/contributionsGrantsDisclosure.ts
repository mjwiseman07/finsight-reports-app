import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasContributionsInput, type EducationEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/education/usgaap/contributionsGrantsDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 958",
  paragraphs: ["958-605-25-11", "958-605-55-8"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitContributionsGrantsDisclosure(input: EducationEmitterInput): EmitterResult {
  if (!hasContributionsInput(input.extracted)) {
    throw new MissingDisclosureInputError("education.revenue.contributions");
  }
  const contributions = input.extracted.education!.revenue!.contributions;
  const text = `Contributions and grants of $${contributions.toLocaleString()} classified and recognized per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "contributions-grants-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "contributions-grants-disclosure", citation: CITATION, text }],
  };
}
