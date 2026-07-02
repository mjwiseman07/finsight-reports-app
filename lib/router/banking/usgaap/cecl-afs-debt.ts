/**
 * ASC 326-30 — AFS debt securities impairment (credit loss component only).
 * SEPARATE measurement path from cecl-loans-hfi.ts — capped at unrealized loss.
 * Citation: ASC 326-30-35-1.
 */
import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/usgaap/cecl-afs-debt.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 326",
  paragraphs: ["326-30-35-1", "326-30-50-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitCeclAfsDebt(input: BankingEmitterInput): EmitterResult {
  const b = input.banking;
  if (!b.hasAFSDebtSecurities || (b.afsDebtUnrealizedLoss ?? 0) <= 0) {
    throw new MissingDisclosureInputError("banking.afsDebtUnrealizedLoss");
  }
  const unrealizedLoss = b.afsDebtUnrealizedLoss!;
  const amortized = b.afsDebtAmortizedCost ?? 0;
  const fairValue = b.afsDebtFairValue ?? 0;
  const cappedAllowance = unrealizedLoss;
  const text = `[${scopeQualifier(b)}] AFS debt CECL (ASC 326-30 credit loss component, capped at unrealized loss $${cappedAllowance.toLocaleString()}): amortized cost $${amortized.toLocaleString()}, fair value $${fairValue.toLocaleString()} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "cecl-afs-debt",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "cecl-afs-debt", citation: CITATION, text }],
  };
}
