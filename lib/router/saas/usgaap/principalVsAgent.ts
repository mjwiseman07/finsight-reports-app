import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapSaasOutputNonComingling } from "../forbidden";
import { hasPrincipalOrAgent, type SaasEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/saas/usgaap/principalVsAgent.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-55-36", "606-10-55-40"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitPrincipalVsAgent(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasPrincipalOrAgent(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.principal_or_agent");
  }

  const role = extracted.contract_revenue!.principal_or_agent!;
  const text = `Entity reports as ${role} for SaaS marketplace transactions per ${CITATION_RESOLVED}.`;
  assertUsgaapSaasOutputNonComingling(text);

  return {
    emitterId: "principal-vs-agent",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "principal-vs-agent", citation: CITATION, text }],
  };
}
