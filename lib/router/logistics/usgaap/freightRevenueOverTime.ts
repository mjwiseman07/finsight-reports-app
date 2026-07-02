import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasFreightRevenueInput, type LogisticsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/logistics/usgaap/freightRevenueOverTime.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-25-19", "606-10-55-21"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitFreightRevenueOverTime(input: LogisticsEmitterInput): EmitterResult {
  if (!hasFreightRevenueInput(input.extracted)) {
    throw new MissingDisclosureInputError("logistics.revenue.freight");
  }
  const freight = input.extracted.logistics!.revenue!.freight;
  const text = `Freight revenue of $${freight.toLocaleString()} recognized over time as transportation services are rendered per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "freight-revenue-over-time",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "freight-revenue-over-time", citation: CITATION, text }],
  };
}
