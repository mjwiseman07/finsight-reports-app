/**
 * IFRS substitute for US §501(r) CHNA — neutral community-benefit language only.
 */
import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { HealthcareEmitterInput } from "../types";
import { assertIfrsHealthcareOutputNonComingling } from "./forbidden";

export const EMITTER_PATH = "lib/router/healthcare/ifrs/communityBenefitPurposeDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS for SMEs",
  paragraphs: ["§27", "EU Directive 2014/95/EU", "UK Charities SORP module 3"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

const NEUTRAL_DISCLOSURE_TEXT =
  "Community benefit assessment cycle and public benefit purpose evaluation disclosed with charitable purpose disclosure per";

export function emitCommunityBenefitPurposeDisclosure(input: HealthcareEmitterInput): EmitterResult {
  const hasSignal =
    /community benefit|public benefit|charitable purpose|healthcare/i.test(input.narrativeHaystack) ||
    input.extracted.framework === "ifrs";

  if (!hasSignal) {
    return {
      emitterId: "chna-cycle",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No IFRS community-benefit anchors in filing corpus",
    };
  }

  const text = `${NEUTRAL_DISCLOSURE_TEXT} ${CITATION_RESOLVED}.`;
  assertIfrsHealthcareOutputNonComingling(text);

  return {
    emitterId: "chna-cycle",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "chna-cycle",
        citation: CITATION,
        text,
      },
    ],
  };
}
