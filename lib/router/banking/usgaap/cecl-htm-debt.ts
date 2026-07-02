/**
 * ASC 326-20 — lifetime ECL for HTM debt securities (uncapped, separate from AFS 326-30).
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

export const EMITTER_PATH = "lib/router/banking/usgaap/cecl-htm-debt.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 326",
  paragraphs: ["326-20-30-1", "326-20-55-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitCeclHtmDebt(input: BankingEmitterInput): EmitterResult {
  const b = input.banking;
  if (!b.hasHTMDebtSecurities || b.htmDebtAmortizedCost == null) {
    throw new MissingDisclosureInputError("banking.htmDebtAmortizedCost");
  }
  const amortized = b.htmDebtAmortizedCost;
  const fairValue = b.htmDebtFairValue ?? amortized;
  const impliedEcl = Math.max(0, amortized - fairValue);
  const text = `[${scopeQualifier(b)}] HTM debt CECL (ASC 326-20 lifetime ECL, uncapped): amortized cost $${amortized.toLocaleString()}, fair value $${fairValue.toLocaleString()}, allowance $${impliedEcl.toLocaleString()} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "cecl-htm-debt",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "cecl-htm-debt", citation: CITATION, text }],
  };
}
