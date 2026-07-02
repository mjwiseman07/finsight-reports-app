import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasEndowmentInput, type EducationEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/education/usgaap/endowmentNetAssetClassification.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 958",
  paragraphs: ["958-205-45-14", "958-320-45-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitEndowmentNetAssetClassification(input: EducationEmitterInput): EmitterResult {
  if (!hasEndowmentInput(input.extracted)) {
    throw new MissingDisclosureInputError("education.endowment");
  }
  const endowment = input.extracted.education!.endowment!;
  const text = `Endowment net assets of $${endowment.total.toLocaleString()} classified under UPMIFA spending policy and ${CITATION_RESOLVED}.`;
  return {
    emitterId: "endowment-net-asset-classification",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "endowment-net-asset-classification", citation: CITATION, text }],
  };
}
