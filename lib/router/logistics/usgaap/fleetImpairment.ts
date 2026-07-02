import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasImpairmentInput, type LogisticsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/logistics/usgaap/fleetImpairment.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 360",
  paragraphs: ["360-10-35-21", "360-10-50-3"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitFleetImpairment(input: LogisticsEmitterInput): EmitterResult {
  if (!hasImpairmentInput(input.extracted)) {
    throw new MissingDisclosureInputError("logistics.impairment");
  }
  const i = input.extracted.logistics!.impairment!;
  const text = `Fleet impairment for ${i.asset_group} (carrying amount $${i.carrying_amount.toLocaleString()}, fair value $${i.fair_value.toLocaleString()}) per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "fleet-impairment",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "fleet-impairment", citation: CITATION, text }],
  };
}
