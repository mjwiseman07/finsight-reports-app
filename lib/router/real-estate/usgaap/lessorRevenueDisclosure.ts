import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasLessorLeasesInput, type RealEstateEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/real-estate/usgaap/lessorRevenueDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 842",
  paragraphs: ["842-30-50-3", "842-30-50-4"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitLessorRevenueDisclosure(input: RealEstateEmitterInput): EmitterResult {
  if (!hasLessorLeasesInput(input.extracted)) {
    throw new MissingDisclosureInputError("real_estate.lessor_leases");
  }
  const l = input.extracted.real_estate!.lessor_leases!;
  const text =
    `Lessor lease revenue: operating $${l.operating.toLocaleString()}, sales-type $${l.sales_type.toLocaleString()}, ` +
    `direct financing $${l.direct_financing.toLocaleString()} per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "lessor-revenue-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "lessor-revenue-disclosure", citation: CITATION, text }],
  };
}
