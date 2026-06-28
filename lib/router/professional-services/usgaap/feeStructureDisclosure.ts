import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapPsOutputNonComingling } from "../forbidden";
import { hasFeeStructureInput, type PsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/professional-services/usgaap/feeStructureDisclosure.ts";

/**
 * IFRS lane has no feeStructureDisclosure — IFRS 15.114 + B87-B89 covers disaggregation generically;
 * hourly/fixed-fee/retainer mix is a US-specific PS reporting convention.
 */
const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-50-5"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitFeeStructureDisclosure(input: PsEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasFeeStructureInput(extracted)) {
    throw new MissingDisclosureInputError("revenue.by_fee_structure");
  }

  const mix = extracted.revenue!.by_fee_structure!;
  const summary = Object.entries(mix)
    .map(([key, value]) => `${key}: $${value}`)
    .join("; ");
  const text = `Professional services revenue disaggregated by fee structure (${summary}) per ${CITATION_RESOLVED}.`;
  assertUsgaapPsOutputNonComingling(text);

  return {
    emitterId: "fee-structure-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "revenue-mix-tm-fixed", citation: CITATION, text }],
  };
}
