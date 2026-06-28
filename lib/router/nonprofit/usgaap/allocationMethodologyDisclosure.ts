import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapNpoOutputNonComingling } from "../forbidden";
import type { NonprofitEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/nonprofit/usgaap/allocationMethodologyDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 958",
  paragraphs: ["958-720-50-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitAllocationMethodologyDisclosure(input: NonprofitEmitterInput): EmitterResult {
  const methodology = input.extracted.allocation_methodology;
  if (!methodology?.method) {
    throw new MissingDisclosureInputError("allocation_methodology.method");
  }
  if (!methodology.rationale) {
    throw new MissingDisclosureInputError("allocation_methodology.rationale");
  }

  const text = `Allocation methodology (${methodology.method}) and rationale disclosed per ${CITATION_RESOLVED}: ${methodology.rationale}`;
  assertUsgaapNpoOutputNonComingling(text);

  return {
    emitterId: "allocation-methodology-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "allocation-methodology-disclosure",
        citation: CITATION,
        text,
      },
    ],
  };
}
