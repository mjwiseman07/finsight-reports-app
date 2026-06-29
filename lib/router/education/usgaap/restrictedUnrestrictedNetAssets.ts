import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasRestrictedNetAssetsInput, type EducationEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/education/usgaap/restrictedUnrestrictedNetAssets.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 958",
  paragraphs: ["958-205-45-1", "958-205-45-7"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitRestrictedUnrestrictedNetAssets(input: EducationEmitterInput): EmitterResult {
  if (!hasRestrictedNetAssetsInput(input.extracted)) {
    throw new MissingDisclosureInputError("education.endowment.with_donor_restrictions");
  }
  const e = input.extracted.education!.endowment!;
  const text = `Net assets with donor restrictions $${e.with_donor_restrictions.toLocaleString()} and without donor restrictions $${e.without_donor_restrictions.toLocaleString()} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "restricted-unrestricted-net-assets",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "restricted-unrestricted-net-assets", citation: CITATION, text }],
  };
}
