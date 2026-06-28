import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsFaOutputNonComingling } from "../forbidden";
import { hasDerivativesInput, type FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/ifrs/derivativesScheduleDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 7",
  paragraphs: ["31", "32", "33", "34", "IFRS 9.5.7"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitDerivativesScheduleDisclosure(input: FundAccountingEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasDerivativesInput(extracted)) {
    throw new MissingDisclosureInputError("fund_accounting.derivatives");
  }

  const contracts = extracted.fund_accounting!.derivatives!.contracts;
  const summary = contracts.map((c) => `${c.type} fair value $${c.fair_value}`).join("; ");
  const text = `Financial instruments risk disclosure for derivatives: ${summary} per ${CITATION_RESOLVED}.`;
  assertIfrsFaOutputNonComingling(text);

  return {
    emitterId: "derivatives-schedule-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "derivatives-schedule", citation: CITATION, text }],
  };
}
