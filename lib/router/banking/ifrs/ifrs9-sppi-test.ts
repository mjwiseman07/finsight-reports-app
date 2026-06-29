import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasIfrs9Input, scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/ifrs/ifrs9-sppi-test.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 9",
  paragraphs: ["4.1.2", "B4.1.7"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitIfrs9SppiTest(input: BankingEmitterInput): EmitterResult {
  if (!hasIfrs9Input(input.banking)) {
    throw new MissingDisclosureInputError("banking.ifrs9");
  }
  const i9 = input.banking.ifrs9!;
  const text = `[${scopeQualifier(input.banking)}] SPPI test ${i9.sppiTestPass ? "passed" : "failed"}; business model ${i9.businessModel} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "ifrs9-sppi-test",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "ifrs9-sppi-test", citation: CITATION, text }],
  };
}
