import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertHedgeDocumentation } from "../forbidden";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/usgaap/hedge-fair-value.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 815",
  paragraphs: ["815-25-35-1", "815-20-25-3"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitHedgeFairValue(input: BankingEmitterInput): EmitterResult {
  const b = input.banking;
  const notional = b.hedgePortfolio?.fairValueHedges ?? 0;
  if (notional <= 0) {
    throw new MissingDisclosureInputError("banking.hedgePortfolio.fairValueHedges");
  }
  assertHedgeDocumentation(b);
  const text = `[${scopeQualifier(b)}] Fair value hedge notional $${notional.toLocaleString()} with contemporaneous hedge documentation per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "hedge-fair-value",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "hedge-fair-value", citation: CITATION, text }],
  };
}
