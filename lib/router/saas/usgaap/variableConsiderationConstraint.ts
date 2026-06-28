import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapSaasOutputNonComingling } from "../forbidden";
import { hasVariableConsideration, type SaasEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/saas/usgaap/variableConsiderationConstraint.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-32-11", "606-10-50-20"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitVariableConsiderationConstraint(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasVariableConsideration(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.variable_consideration");
  }

  const vc = extracted.contract_revenue!.variable_consideration!;
  const text = `Variable consideration of $${vc.constrained_amount} constrained (${vc.constraint_rationale}) per ${CITATION_RESOLVED}.`;
  assertUsgaapSaasOutputNonComingling(text);

  return {
    emitterId: "variable-consideration-constraint",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "variable-consideration-constraint", citation: CITATION, text }],
  };
}
