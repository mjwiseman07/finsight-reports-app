import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/usgaap/htm-taint-disclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 320",
  paragraphs: ["320-10-25-14", "320-10-50-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitHtmTaintDisclosure(input: BankingEmitterInput): EmitterResult {
  const b = input.banking;
  if (!b.htmSaleDuringPeriod) {
    throw new MissingDisclosureInputError("banking.htmSaleDuringPeriod");
  }
  const exception = b.htmPermittedExceptionFlag ? "permitted exception applies" : "taint rule applies";
  const text = `[${scopeQualifier(b)}] HTM security sale during period — ${exception} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "htm-taint-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "htm-taint-disclosure", citation: CITATION, text }],
  };
}
