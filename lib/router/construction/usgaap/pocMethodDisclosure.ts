import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/usgaap/pocMethodDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-25-31", "606-10-55-21"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitPocMethodDisclosure(input: ConstructionEmitterInput): EmitterResult {
  const hasSignal =
    input.hasContractRevenueTag ||
    /percentage of completion|cost-?to-?cost|over time|input method/i.test(input.narrativeHaystack) ||
    input.extracted.vertical === "con";

  if (!hasSignal) {
    return {
      emitterId: "poc-method-declared",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No contract revenue or PoC signals in filing corpus",
    };
  }

  return {
    emitterId: "poc-method-declared",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "poc-method-declared",
        citation: CITATION,
        text: `Revenue on construction contracts recognized over time using an input method (cost-to-cost percentage of completion) per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
