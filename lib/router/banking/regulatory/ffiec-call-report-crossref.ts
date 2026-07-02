import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/regulatory/ffiec-call-report-crossref.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 942",
  paragraphs: ["FFIEC Call Report", "RC-D schedule"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitFfiecCallReportCrossref(input: BankingEmitterInput): EmitterResult {
  const form = input.banking.callReportForm;
  if (!form || !["031", "041", "051"].includes(form)) {
    throw new MissingDisclosureInputError("banking.callReportForm");
  }
  const reduced =
    form === "051"
      ? "FFIEC 051 reduced schedule scope (graceful degradation — no full RC-D detail required)"
      : `FFIEC ${form} Call Report cross-reference`;
  const text = `[${scopeQualifier(input.banking)}] ${reduced} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "ffiec-call-report-crossref",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "ffiec-call-report-crossref", citation: CITATION, text }],
  };
}
