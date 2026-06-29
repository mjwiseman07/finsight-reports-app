import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasIpsasNonExchangeInput, type EducationEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/education/ipsas/nonExchangeRevenueDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IPSAS 23",
  paragraphs: ["23.14", "23.17"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitNonExchangeRevenueDisclosure(input: EducationEmitterInput): EmitterResult {
  if (!hasIpsasNonExchangeInput(input.extracted)) {
    throw new MissingDisclosureInputError("education.ipsas_non_exchange");
  }
  const grant = input.extracted.education!.ipsas_non_exchange!.grant_revenue;
  const text = `Non-exchange grant revenue $${grant.toLocaleString()} recognized when conditions satisfied per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "ipsas-non-exchange-revenue",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "ipsas-non-exchange-revenue", citation: CITATION, text }],
  };
}
