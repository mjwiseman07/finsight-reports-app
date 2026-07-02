import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasAuxiliaryEnterprisesInput, type EducationEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/education/usgaap/auxiliaryEnterprisesDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 958",
  paragraphs: ["958-720-45-15"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitAuxiliaryEnterprisesDisclosure(input: EducationEmitterInput): EmitterResult {
  if (!hasAuxiliaryEnterprisesInput(input.extracted)) {
    throw new MissingDisclosureInputError("education.auxiliary_enterprises");
  }
  const a = input.extracted.education!.auxiliary_enterprises!;
  const text = `Auxiliary enterprise revenue (housing $${a.housing.toLocaleString()}, dining $${a.dining.toLocaleString()}, athletics $${a.athletics.toLocaleString()}) per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "auxiliary-enterprises-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "auxiliary-enterprises-disclosure", citation: CITATION, text }],
  };
}
