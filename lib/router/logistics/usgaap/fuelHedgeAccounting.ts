import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasFuelHedgeInput, type LogisticsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/logistics/usgaap/fuelHedgeAccounting.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 815",
  paragraphs: ["815-20-25-1", "815-20-35-2"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitFuelHedgeAccounting(input: LogisticsEmitterInput): EmitterResult {
  if (!hasFuelHedgeInput(input.extracted)) {
    throw new MissingDisclosureInputError("logistics.fuel_hedge");
  }
  const h = input.extracted.logistics!.fuel_hedge!;
  const text = `Fuel hedge (notional $${h.notional.toLocaleString()}, fair value $${h.fair_value.toLocaleString()}, effectiveness ${h.effectiveness_pct}%) accounted for per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "fuel-hedge-accounting",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "fuel-hedge-accounting", citation: CITATION, text }],
  };
}
