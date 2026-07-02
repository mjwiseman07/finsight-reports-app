import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertHedgeDocumentation } from "../forbidden";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/usgaap/hedge-portfolio-layer.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 815",
  paragraphs: ["815-20-25-12", "815-20-55-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitHedgePortfolioLayer(input: BankingEmitterInput): EmitterResult {
  const b = input.banking;
  const notional = b.hedgePortfolio?.portfolioLayerHedges ?? 0;
  if (notional <= 0) {
    throw new MissingDisclosureInputError("banking.hedgePortfolio.portfolioLayerHedges");
  }
  assertHedgeDocumentation(b);
  const text = `[${scopeQualifier(b)}] Portfolio layer hedge notional $${notional.toLocaleString()} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "hedge-portfolio-layer",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "hedge-portfolio-layer", citation: CITATION, text }],
  };
}
