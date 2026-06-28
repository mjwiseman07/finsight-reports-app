import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsSaasOutputNonComingling } from "../forbidden";
import { hasVariableConsideration, type SaasEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/saas/ifrs/variableConsiderationConstraint.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["56", "57", "58"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitVariableConsiderationConstraint(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasVariableConsideration(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.variable_consideration");
  }

  const vc = extracted.contract_revenue!.variable_consideration!;
  const text = `Variable consideration of EUR ${vc.constrained_amount} constrained (${vc.constraint_rationale}) per ${CITATION_RESOLVED}.`;
  assertIfrsSaasOutputNonComingling(text);

  return {
    emitterId: "variable-consideration-constraint",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "variable-consideration-constraint", citation: CITATION, text }],
  };
}
