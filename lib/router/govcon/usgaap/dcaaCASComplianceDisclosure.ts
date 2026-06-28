import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapGovconOutputNonComingling } from "../forbidden";
import { hasCasCoverage, type GovconEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/govcon/usgaap/dcaaCASComplianceDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "CAS",
  paragraphs: ["401", "402", "403", "405", "406", "410", "418"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitDcaaCASComplianceDisclosure(input: GovconEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasCasCoverage(extracted)) {
    throw new MissingDisclosureInputError("cas_coverage");
  }

  const cas = extracted.govcon!.cas_coverage!;
  const standards = cas.applicable_standards.join(", ");
  const text = `Cost Accounting Standards (${standards}) apply under ${cas.coverage_type} coverage, establishing consistency in estimating, accumulating, and reporting contract costs per ${CITATION_RESOLVED}.`;
  assertUsgaapGovconOutputNonComingling(text);

  return {
    emitterId: "dcaa-cas-compliance-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "far-cas-allocation", citation: CITATION, text }],
  };
}
