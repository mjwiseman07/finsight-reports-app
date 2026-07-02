import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasIfrs9Input, scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/ifrs/ifrs9-staged-ecl.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 9",
  paragraphs: ["5.5.5", "5.5.17"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitIfrs9StagedEcl(input: BankingEmitterInput): EmitterResult {
  if (!hasIfrs9Input(input.banking)) {
    throw new MissingDisclosureInputError("banking.ifrs9");
  }
  const i9 = input.banking.ifrs9!;
  const text = `[${scopeQualifier(input.banking)}] IFRS 9 staged ECL: Stage 1 $${i9.stage1ECL.toLocaleString()}, Stage 2 $${i9.stage2ECL.toLocaleString()}, Stage 3 $${i9.stage3ECL.toLocaleString()} (not equivalent to US GAAP lifetime CECL) per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "ifrs9-staged-ecl",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "ifrs9-staged-ecl", citation: CITATION, text }],
  };
}
