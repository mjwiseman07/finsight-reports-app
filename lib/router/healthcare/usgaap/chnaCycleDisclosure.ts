import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { HealthcareEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/healthcare/usgaap/chnaCycleDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IRC §501(r)",
  paragraphs: ["501(r)(3) IRS regulations", "Form 990 Schedule H Part V"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitChnaCycleDisclosure(input: HealthcareEmitterInput): EmitterResult {
  if (!input.isChnaScopedHospital) {
    return {
      emitterId: "chna-cycle",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "CHNA scope: §501(c)(3) hospitals only — emitter dormant for this entity",
    };
  }

  const hasSignal =
    /community health needs|chna|implementation strategy/i.test(input.narrativeHaystack) ||
    input.extracted.vertical === "hc";

  if (!hasSignal) {
    return {
      emitterId: "chna-cycle",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No CHNA cycle anchors in filing corpus",
    };
  }

  return {
    emitterId: "chna-cycle",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "chna-cycle",
        citation: CITATION,
        text: `Community Health Needs Assessment cycle and implementation strategy disclosed per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
