import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsPsOutputNonComingling } from "../forbidden";
import { hasPrincipalAgentInput, type PsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/professional-services/ifrs/principalVsAgentDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["B34", "B35", "B38"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitPrincipalVsAgentDisclosure(input: PsEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasPrincipalAgentInput(extracted)) {
    throw new MissingDisclosureInputError("engagement.classification/indicators");
  }

  const eng = extracted.engagement!;
  const indicatorSummary = eng.indicators.join("; ");
  const text = `Consulting engagement classified as ${eng.classification} (${indicatorSummary}) per ${CITATION_RESOLVED}.`;
  assertIfrsPsOutputNonComingling(text);

  return {
    emitterId: "principal-vs-agent-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "principal-agent-pass-through", citation: CITATION, text }],
  };
}
