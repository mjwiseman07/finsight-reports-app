import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsSaasOutputNonComingling } from "../forbidden";
import { hasCostToObtain, type SaasEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/saas/ifrs/costToObtainContract.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["91", "92", "93", "94"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitCostToObtainContract(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasCostToObtain(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.cost_to_obtain");
  }

  const cto = extracted.contract_revenue!.cost_to_obtain!;
  const text = `Incremental costs to obtain contracts capitalized at EUR ${cto.capitalized} with amortization EUR ${cto.amortization} per ${CITATION_RESOLVED}.`;
  assertIfrsSaasOutputNonComingling(text);

  return {
    emitterId: "cost-to-obtain-contract",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "cost-to-obtain-contract", citation: CITATION, text }],
  };
}
