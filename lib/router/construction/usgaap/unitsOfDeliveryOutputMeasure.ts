import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapConOutputNonComingling } from "../forbidden";
import { hasUnitsOfDeliveryInput, type ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/usgaap/unitsOfDeliveryOutputMeasure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-25-31", "606-10-55-17", "606-10-55-19"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitUnitsOfDeliveryOutputMeasure(input: ConstructionEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasUnitsOfDeliveryInput(extracted)) {
    throw new MissingDisclosureInputError("construction.output_measure (units-of-delivery)");
  }

  const measure = extracted.construction!.output_measure!;
  const text = `Revenue recognized over time using units-of-delivery output measure (${measure.unit_definition}: ${measure.unit_progress} units complete) per ${CITATION_RESOLVED}.`;
  assertUsgaapConOutputNonComingling(text);

  return {
    emitterId: "units-of-delivery-output-measure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "asc606-over-time", citation: CITATION, text }],
  };
}
