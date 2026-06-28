import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapFaOutputNonComingling } from "../forbidden";
import { hasDerivativesInput, type FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/usgaap/derivativesScheduleDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 815",
  paragraphs: ["815-10-50-4", "ASC 946-210-50-12"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitDerivativesScheduleDisclosure(input: FundAccountingEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasDerivativesInput(extracted)) {
    throw new MissingDisclosureInputError("fund_accounting.derivatives");
  }

  const contracts = extracted.fund_accounting!.derivatives!.contracts;
  const summary = contracts.map((c) => `${c.type} notional $${c.notional}`).join("; ");
  const text = `Schedule of derivative instruments: ${summary} per ${CITATION_RESOLVED}.`;
  assertUsgaapFaOutputNonComingling(text);

  return {
    emitterId: "derivatives-schedule-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "derivatives-schedule", citation: CITATION, text }],
  };
}
