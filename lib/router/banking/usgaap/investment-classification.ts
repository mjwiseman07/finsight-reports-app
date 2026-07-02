import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/usgaap/investment-classification.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 320",
  paragraphs: ["320-10-25-1", "825-10-25-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitInvestmentClassification(input: BankingEmitterInput): EmitterResult {
  const b = input.banking;
  const afs = b.hasAFSDebtSecurities ? "AFS debt securities present" : "no AFS debt";
  const htm = b.hasHTMDebtSecurities ? "HTM debt securities present" : "no HTM debt";
  const text = `[${scopeQualifier(b)}] Investment classification: ${afs}; ${htm}; total assets $${b.totalAssets.toLocaleString()} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "investment-classification",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "investment-classification", citation: CITATION, text }],
  };
}
