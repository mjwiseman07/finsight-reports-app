import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasInScopeCeclAssets, scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/usgaap/allowance-rollforward.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 326",
  paragraphs: ["326-20-50-5", "326-30-50-2"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitAllowanceRollforward(input: BankingEmitterInput): EmitterResult {
  if (!hasInScopeCeclAssets(input.banking)) {
    throw new MissingDisclosureInputError("banking.in-scope-cecl-assets");
  }
  const b = input.banking;
  const loanAllowance = b.loansHFI?.allowanceForCreditLosses ?? 0;
  const text = `[${scopeQualifier(b)}] Allowance rollforward reconciles HFI ($${loanAllowance.toLocaleString()}), AFS credit loss component, HTM, and OBS CECL buckets per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "allowance-rollforward",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "allowance-rollforward", citation: CITATION, text }],
  };
}
