import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapSaasOutputNonComingling } from "../forbidden";
import { hasRevenueDisaggregation, type SaasEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/saas/usgaap/revenueDisaggregation.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-50-5", "606-10-55-89", "606-10-55-91"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitRevenueDisaggregation(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasRevenueDisaggregation(extracted) && !input.hasRevenuesTag) {
    throw new MissingDisclosureInputError("contract_revenue.revenue_by_category");
  }

  const categories = extracted.contract_revenue?.revenue_by_category;
  const summary = categories
    ? Object.entries(categories)
        .map(([key, value]) => `${key}: $${value}`)
        .join("; ")
    : "subscription and services revenue streams";

  const text = `SaaS revenue disaggregated by category (${summary}) per ${CITATION_RESOLVED}.`;
  assertUsgaapSaasOutputNonComingling(text);

  return {
    emitterId: "revenue-disaggregation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "revenue-disaggregation", citation: CITATION, text }],
  };
}
