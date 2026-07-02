import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertLongDurationForLdtiEmitter } from "../forbidden";
import { hasLongDurationInput, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/usgaap/dacAmortization.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 944",
  paragraphs: ["944-30-35-1", "ASU 2018-12 DAC amortization"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitDacAmortization(input: InsuranceEmitterInput): EmitterResult {
  if (!hasLongDurationInput(input.insurance)) {
    throw new MissingDisclosureInputError("insurance.longDuration.dacBalance");
  }
  assertLongDurationForLdtiEmitter(input.insurance, "dacAmortization");
  const ld = input.insurance.longDuration!;
  const text = `Deferred acquisition costs balance $${ld.dacBalance.toLocaleString()} amortized on ${ld.dacAmortizationBase} basis per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "dac-amortization",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "dac-amortization", citation: CITATION, text }],
  };
}
