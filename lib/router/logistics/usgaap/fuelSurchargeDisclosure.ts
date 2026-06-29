import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasFuelSurchargeInput, type LogisticsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/logistics/usgaap/fuelSurchargeDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-32-2", "606-10-55-91"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitFuelSurchargeDisclosure(input: LogisticsEmitterInput): EmitterResult {
  if (!hasFuelSurchargeInput(input.extracted)) {
    throw new MissingDisclosureInputError("logistics.revenue.fuel_surcharge");
  }
  const fuelSurcharge = input.extracted.logistics!.revenue!.fuel_surcharge;
  const text = `Fuel surcharge revenue of $${fuelSurcharge.toLocaleString()} disclosed as variable consideration per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "fuel-surcharge-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "fuel-surcharge-disclosure", citation: CITATION, text }],
  };
}
