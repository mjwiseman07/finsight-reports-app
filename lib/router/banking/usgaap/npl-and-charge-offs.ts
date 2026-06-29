import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/usgaap/npl-and-charge-offs.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 310",
  paragraphs: ["310-10-35-7", "326-20-50-6"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitNplAndChargeOffs(input: BankingEmitterInput): EmitterResult {
  const b = input.banking;
  if (!b.hasLoansHFI || !b.loansHFI) {
    throw new MissingDisclosureInputError("banking.loansHFI");
  }
  const loans = b.loansHFI;
  const text = `[${scopeQualifier(b)}] Nonaccrual loans $${loans.nonaccrualBalance.toLocaleString()}; charge-offs YTD $${loans.chargeOffsYTD.toLocaleString()}, recoveries $${loans.recoveriesYTD.toLocaleString()} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "npl-and-charge-offs",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "npl-and-charge-offs", citation: CITATION, text }],
  };
}
