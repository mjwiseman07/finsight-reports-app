import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import type { InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/usgaap/embeddedDerivativesVA.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 815",
  paragraphs: ["815-15-25-1", "944-40-25-25C MRB evaluated first"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitEmbeddedDerivativesVA(input: InsuranceEmitterInput): EmitterResult {
  const ins = input.insurance;
  if (!ins.hasVariableAnnuityProducts || !ins.variableAnnuityBlock) {
    throw new MissingDisclosureInputError("insurance.variableAnnuityBlock");
  }
  const va = ins.variableAnnuityBlock;
  const riders = [
    va.gmdbFlag ? "GMDB" : null,
    va.gmwbFlag ? "GMWB" : null,
    va.gmibFlag ? "GMIB" : null,
  ].filter(Boolean);
  const text = `Variable annuity embedded derivative evaluation on account value $${va.accountValueGross.toLocaleString()} (riders: ${riders.join(", ") || "none"}) — evaluated only after MRB test does not apply per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "embedded-derivatives-va",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "embedded-derivatives-va", citation: CITATION, text }],
  };
}
