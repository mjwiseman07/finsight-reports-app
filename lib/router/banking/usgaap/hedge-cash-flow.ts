import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertHedgeDocumentation } from "../forbidden";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/usgaap/hedge-cash-flow.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 815",
  paragraphs: ["815-20-25-3", "815-20-35-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitHedgeCashFlow(input: BankingEmitterInput): EmitterResult {
  const b = input.banking;
  const notional = b.hedgePortfolio?.cashFlowHedges ?? 0;
  if (notional <= 0) {
    throw new MissingDisclosureInputError("banking.hedgePortfolio.cashFlowHedges");
  }
  assertHedgeDocumentation(b);
  const text = `[${scopeQualifier(b)}] Cash flow hedge notional $${notional.toLocaleString()} with contemporaneous hedge documentation per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "hedge-cash-flow",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "hedge-cash-flow", citation: CITATION, text }],
  };
}
