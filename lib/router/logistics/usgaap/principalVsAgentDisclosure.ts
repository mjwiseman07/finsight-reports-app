import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasPrincipalOrAgentInput, type LogisticsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/logistics/usgaap/principalVsAgentDisclosure.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-55-36", "606-10-55-40"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitPrincipalVsAgentDisclosure(input: LogisticsEmitterInput): EmitterResult {
  if (!hasPrincipalOrAgentInput(input.extracted)) {
    throw new MissingDisclosureInputError("logistics.principal_or_agent");
  }
  const role = input.extracted.logistics!.principal_or_agent!;
  const text = `Entity reports as ${role} for logistics brokerage and managed transportation transactions per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "principal-vs-agent-disclosure",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "principal-vs-agent-disclosure", citation: CITATION, text }],
  };
}
