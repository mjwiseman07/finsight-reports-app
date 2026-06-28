import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapPsOutputNonComingling } from "../forbidden";
import { hasPrincipalAgentInput, type PsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/professional-services/usgaap/principalVsAgentDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-55-36", "606-10-55-40"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitPrincipalVsAgentDisclosure(input: PsEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasPrincipalAgentInput(extracted)) {
    throw new MissingDisclosureInputError("engagement.classification/indicators");
  }

  const eng = extracted.engagement!;
  const indicatorSummary = eng.indicators.join("; ");
  const text = `Professional services engagement classified as ${eng.classification} based on indicators (${indicatorSummary}) per ${CITATION_RESOLVED}.`;
  assertUsgaapPsOutputNonComingling(text);

  return {
    emitterId: "principal-vs-agent-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "principal-agent-pass-through", citation: CITATION, text }],
  };
}
