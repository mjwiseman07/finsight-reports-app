import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasTitleIvInput, type EducationEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/education/usgaap/titleIvCompositeScore.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 958",
  paragraphs: ["958-205-45-1", "34 CFR 668.172 composite score"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitTitleIvCompositeScore(input: EducationEmitterInput): EmitterResult {
  if (!hasTitleIvInput(input.extracted)) {
    throw new MissingDisclosureInputError("education.title_iv");
  }
  const titleIv = input.extracted.education!.title_iv!;
  const text = `Title IV financial responsibility composite score ${titleIv.composite_score} (${titleIv.financial_responsibility_zone}) per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "title-iv-composite-score",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "title-iv-composite-score", citation: CITATION, text }],
  };
}
