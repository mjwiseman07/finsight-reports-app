import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasSapInput, type InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/sap/statutoryReconciliation.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 944",
  paragraphs: ["944-20-S99", "NAIC SAP to US GAAP reconciliation"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitStatutoryReconciliation(input: InsuranceEmitterInput): EmitterResult {
  if (!input.insurance.naicFilerFlag || !input.insurance.sap) {
    throw new MissingDisclosureInputError("insurance.sap");
  }
  const sap = input.insurance.sap;
  const text = `NAIC ${sap.annualStatementType} statutory net income $${sap.statutoryNetIncome.toLocaleString()} and surplus $${sap.statutorySurplus.toLocaleString()} reconciled to US GAAP per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "statutory-reconciliation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "statutory-reconciliation", citation: CITATION, text }],
  };
}
