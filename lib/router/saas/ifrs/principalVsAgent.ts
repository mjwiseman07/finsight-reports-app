import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsSaasOutputNonComingling } from "../forbidden";
import { hasPrincipalOrAgent, type SaasEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/saas/ifrs/principalVsAgent.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["B34", "B35", "B38"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitPrincipalVsAgent(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasPrincipalOrAgent(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.principal_or_agent");
  }

  const role = extracted.contract_revenue!.principal_or_agent!;
  const text = `Entity reports as ${role} for cloud marketplace transactions per ${CITATION_RESOLVED}.`;
  assertIfrsSaasOutputNonComingling(text);

  return {
    emitterId: "principal-vs-agent",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "principal-vs-agent", citation: CITATION, text }],
  };
}
