import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapSaasOutputNonComingling } from "../forbidden";
import { hasCostToObtain, type SaasEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/saas/usgaap/costToObtainContract.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 340-40",
  paragraphs: ["340-40-25-1", "340-40-35-1"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitCostToObtainContract(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasCostToObtain(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.cost_to_obtain");
  }

  const cto = extracted.contract_revenue!.cost_to_obtain!;
  const text = `Capitalized cost to obtain contracts of $${cto.capitalized} with amortization of $${cto.amortization} per ${CITATION_RESOLVED}.`;
  assertUsgaapSaasOutputNonComingling(text);

  return {
    emitterId: "cost-to-obtain-contract",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "cost-to-obtain-contract", citation: CITATION, text }],
  };
}
