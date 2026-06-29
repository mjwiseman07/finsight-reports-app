import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasRealEstateSalesInput, type RealEstateEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/real-estate/usgaap/realEstateSalesDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 610-20",
  paragraphs: ["610-20-45-12", "610-20-25-6"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitRealEstateSalesDisclosure(input: RealEstateEmitterInput): EmitterResult {
  if (!hasRealEstateSalesInput(input.extracted)) {
    throw new MissingDisclosureInputError("real_estate.real_estate_sales");
  }
  const s = input.extracted.real_estate!.real_estate_sales!;
  const text =
    `Real estate sales: full accrual $${s.full_accrual.toLocaleString()}, partial sales $${s.partial_sales.toLocaleString()} ` +
    `per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "real-estate-sales-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "real-estate-sales-disclosure", citation: CITATION, text }],
  };
}
