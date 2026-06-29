import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasIfrs9Input, scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/ifrs/ifrs9-hedge-accounting.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 9",
  paragraphs: ["6.1.1", "6.5.2"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitIfrs9HedgeAccounting(input: BankingEmitterInput): EmitterResult {
  if (!hasIfrs9Input(input.banking) || !input.banking.hedgePortfolio) {
    throw new MissingDisclosureInputError("banking.hedgePortfolio");
  }
  const hp = input.banking.hedgePortfolio;
  const text = `[${scopeQualifier(input.banking)}] IFRS 9 hedge accounting: cash flow $${hp.cashFlowHedges.toLocaleString()}, fair value $${hp.fairValueHedges.toLocaleString()} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "ifrs9-hedge-accounting",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "ifrs9-hedge-accounting", citation: CITATION, text }],
  };
}
