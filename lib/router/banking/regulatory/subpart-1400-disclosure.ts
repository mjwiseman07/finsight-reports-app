import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertNoIndustryGuide3 } from "../forbidden";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/regulatory/subpart-1400-disclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 942",
  paragraphs: ["SEC Subpart 1400", "Regulation S-K"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitSubpart1400Disclosure(input: BankingEmitterInput): EmitterResult {
  if (!input.banking.secFilerFlag) {
    throw new MissingDisclosureInputError("banking.secFilerFlag");
  }
  const text = `[${scopeQualifier(input.banking)}] SEC Subpart 1400 banking disclosures (mandatory for SEC filers; Industry Guide 3 superseded) per ${CITATION_RESOLVED}.`;
  assertNoIndustryGuide3(text);
  return {
    emitterId: "subpart-1400-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "subpart-1400-disclosure", citation: CITATION, text }],
  };
}
