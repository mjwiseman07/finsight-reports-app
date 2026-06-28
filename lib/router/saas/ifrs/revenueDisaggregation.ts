import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsSaasOutputNonComingling } from "../forbidden";
import { hasRevenueDisaggregation, type SaasEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/saas/ifrs/revenueDisaggregation.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["114", "B87", "B88", "B89"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitRevenueDisaggregation(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasRevenueDisaggregation(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.revenue_by_category");
  }

  const categories = extracted.contract_revenue!.revenue_by_category!;
  const summary = Object.entries(categories)
    .map(([key, value]) => `${key}: EUR ${value}`)
    .join("; ");

  const text = `Cloud revenue disaggregated by category (${summary}) per ${CITATION_RESOLVED}.`;
  assertIfrsSaasOutputNonComingling(text);

  return {
    emitterId: "revenue-disaggregation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "revenue-disaggregation", citation: CITATION, text }],
  };
}
