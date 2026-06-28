import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsConOutputNonComingling } from "../forbidden";
import { hasUnitsOfDeliveryInput, type ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/ifrs/unitsOfDeliveryOutputMeasure.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["B14", "B16", "124"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitUnitsOfDeliveryOutputMeasure(input: ConstructionEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasUnitsOfDeliveryInput(extracted)) {
    throw new MissingDisclosureInputError("construction.output_measure (units-of-delivery)");
  }

  const measure = extracted.construction!.output_measure!;
  const text = `Revenue recognized over time using units-of-delivery output measure (${measure.unit_definition}: ${measure.unit_progress} units complete) per ${CITATION_RESOLVED}.`;
  assertIfrsConOutputNonComingling(text);

  return {
    emitterId: "units-of-delivery-output-measure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "asc606-over-time", citation: CITATION, text }],
  };
}
