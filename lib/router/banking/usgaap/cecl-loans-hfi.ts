/**
 * ASC 326-20 — lifetime expected credit losses for HFI loans (uncapped).
 * SEPARATE measurement path from cecl-afs-debt.ts (ASC 326-30).
 * Citation: ASC 326-20-30-1.
 */
import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/usgaap/cecl-loans-hfi.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 326",
  paragraphs: ["326-20-30-1", "326-20-50-4"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitCeclLoansHfi(input: BankingEmitterInput): EmitterResult {
  const b = input.banking;
  if (!b.hasLoansHFI || !b.loansHFI) {
    throw new MissingDisclosureInputError("banking.loansHFI");
  }
  const loans = b.loansHFI;
  const lifetimeEcl = loans.allowanceForCreditLosses;
  const text = `[${scopeQualifier(b)}] HFI loans CECL (ASC 326-20 lifetime ECL, uncapped): amortized cost $${loans.totalAmortizedCost.toLocaleString()}, allowance $${lifetimeEcl.toLocaleString()} using ${loans.ceclMethodology} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "cecl-loans-hfi",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "cecl-loans-hfi", citation: CITATION, text }],
  };
}
