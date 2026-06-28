/**
 * IFRS substitute: no direct expense-ratio equivalent under IFRS 7 / IAS 1.
 * Emits FVTPL expense breakdown with management-fee call-out (framework-bound, not comingling).
 */
import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { FundAccountingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/fund-accounting/ifrs/navPerShareDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 7",
  paragraphs: ["IFRS 13 fair value hierarchy", "IAS 32 financial instruments"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitNavPerShareDisclosure(input: FundAccountingEmitterInput): EmitterResult {
  const hasSignal = input.hasNavNarrative || input.isNcsrOrNq || input.extracted.framework === "ifrs";

  if (!hasSignal) {
    return {
      emitterId: "nav-computation",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No IFRS NAV disclosure anchors",
    };
  }

  return {
    emitterId: "nav-computation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "nav-computation",
        citation: CITATION,
        text: `Net asset value per share disclosed with IFRS 7 fair value hierarchy and IAS 32 presentation per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
