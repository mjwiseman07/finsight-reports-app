import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasRegulatoryCapital, scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/regulatory/risk-weighted-assets.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 942",
  paragraphs: ["12 CFR Part 217.31", "RWA disclosure"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitRiskWeightedAssets(input: BankingEmitterInput): EmitterResult {
  if (!hasRegulatoryCapital(input.banking)) {
    throw new MissingDisclosureInputError("banking.regulatoryCapital.riskWeightedAssets");
  }
  const rwa = input.banking.regulatoryCapital!.riskWeightedAssets;
  const text = `[${scopeQualifier(input.banking)}] Risk-weighted assets $${rwa.toLocaleString()} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "risk-weighted-assets",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "risk-weighted-assets", citation: CITATION, text }],
  };
}
