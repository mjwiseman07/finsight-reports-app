import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasInvestmentPropertyInput, type RealEstateEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/real-estate/ifrs/investmentPropertyFairValue.ts";

const CITATION: EmitterCitation = {
  standard: "IAS 40",
  paragraphs: ["40.75", "40.76", "40.79"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitInvestmentPropertyFairValue(input: RealEstateEmitterInput): EmitterResult {
  if (!hasInvestmentPropertyInput(input.extracted)) {
    throw new MissingDisclosureInputError("real_estate.investment_property");
  }
  const i = input.extracted.real_estate!.investment_property!;
  const text =
    `Investment property fair value $${i.fair_value.toLocaleString()} versus carrying amount $${i.carrying_amount.toLocaleString()} ` +
    `per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "investment-property-fair-value",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "investment-property-fair-value", citation: CITATION, text }],
  };
}
