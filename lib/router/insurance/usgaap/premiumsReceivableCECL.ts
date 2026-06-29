import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import type { InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/usgaap/premiumsReceivableCECL.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 326",
  paragraphs: ["326-20-50-6", "944 narrow scope premiums receivable"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitPremiumsReceivableCECL(input: InsuranceEmitterInput): EmitterResult {
  const ins = input.insurance;
  if (ins.premiumsReceivable <= 0) {
    throw new MissingDisclosureInputError("insurance.premiumsReceivable");
  }
  const text = `Premiums receivable CECL allowance $${ins.premiumsReceivableCECLAllowance.toLocaleString()} on gross premiums receivable $${ins.premiumsReceivable.toLocaleString()} (ASC 326 narrow scope — premiums receivable only; not applied to loss reserves or DAC) per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "premiums-receivable-cecl",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "premiums-receivable-cecl", citation: CITATION, text }],
  };
}
