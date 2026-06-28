import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterLine,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapConOutputNonComingling } from "../forbidden";
import { hasMilestoneInput, type ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/usgaap/milestoneOutputMeasure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-55-17", "606-10-55-19", "606-10-25-31"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitMilestoneOutputMeasure(input: ConstructionEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasMilestoneInput(extracted)) {
    throw new MissingDisclosureInputError("construction.output_measure (milestones)");
  }

  const measure = extracted.construction!.output_measure!;
  const achieved = measure.milestones_achieved!.join(", ");
  const overTimeText = `Revenue recognized over time using milestones-reached output measure (${achieved}) per ${CITATION_RESOLVED}.`;
  const pocText = `Percentage-of-completion method declared using milestone-based output measure per ${CITATION_RESOLVED}.`;
  assertUsgaapConOutputNonComingling(overTimeText);
  assertUsgaapConOutputNonComingling(pocText);

  const lines: EmitterLine[] = [
    { assertionId: "asc606-over-time", citation: CITATION, text: overTimeText },
    { assertionId: "poc-method-declared", citation: CITATION, text: pocText },
  ];

  return {
    emitterId: "milestone-output-measure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines,
  };
}
