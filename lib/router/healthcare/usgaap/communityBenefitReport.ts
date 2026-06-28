import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { HealthcareEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/healthcare/usgaap/communityBenefitReport.ts";

const CITATION: EmitterCitation = {
  standard: "Form 990",
  paragraphs: ["Schedule H Part I", "Schedule H Part III"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitCommunityBenefitReport(input: HealthcareEmitterInput): EmitterResult {
  if (!input.isChnaScopedHospital) {
    return {
      emitterId: "community-benefit-report",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "Community benefit report scope: §501(c)(3) hospitals only — emitter dormant",
    };
  }

  const hasSignal =
    /financial assistance|community benefit|charity care|uncompensated care/i.test(input.narrativeHaystack) ||
    input.extracted.vertical === "hc";

  if (!hasSignal) {
    return {
      emitterId: "community-benefit-report",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No community benefit program anchors in filing corpus",
    };
  }

  return {
    emitterId: "community-benefit-report",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "community-benefit-report",
        citation: CITATION,
        text: `Financial assistance and community benefit programs reported per ${CITATION_RESOLVED}.`,
      },
    ],
  };
}
