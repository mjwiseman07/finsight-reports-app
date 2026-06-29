import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertNoIndustryGuide3 } from "../forbidden";
import { hasRegulatoryCapital, scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/regulatory/regulatory-capital-ratios.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 942",
  paragraphs: ["12 CFR Part 217", "Basel III CET1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitRegulatoryCapitalRatios(input: BankingEmitterInput): EmitterResult {
  if (!hasRegulatoryCapital(input.banking)) {
    throw new MissingDisclosureInputError("banking.regulatoryCapital");
  }
  const rc = input.banking.regulatoryCapital!;
  const text = `[${scopeQualifier(input.banking)}] Regulatory capital ratios: CET1 ${(rc.cet1Ratio * 100).toFixed(2)}%, Tier 1 ${(rc.tier1Ratio * 100).toFixed(2)}%, Total ${(rc.totalCapitalRatio * 100).toFixed(2)}%, leverage ${(rc.tier1LeverageRatio * 100).toFixed(2)}% per ${CITATION_RESOLVED}.`;
  assertNoIndustryGuide3(text);
  return {
    emitterId: "regulatory-capital-ratios",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "regulatory-capital-ratios", citation: CITATION, text }],
  };
}
