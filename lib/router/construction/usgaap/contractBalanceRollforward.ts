import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import type { ConstructionEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/construction/usgaap/contractBalanceRollforward.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-45-1", "606-10-45-5", "606-10-50-9"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitContractBalanceRollforward(input: ConstructionEmitterInput): EmitterResult {
  const balances = input.extracted.construction?.contract_balances;
  const hasSignal =
    Boolean(balances) ||
    input.hasContractLiabilityNarrative ||
    input.hasContractRevenueTag ||
    /contract asset|contract liability|billings in excess/i.test(input.narrativeHaystack);

  if (!hasSignal) {
    return {
      emitterId: "contract-balances-rollforward",
      emitterPath: EMITTER_PATH,
      lines: [],
      status: "fail-closed",
      failureReason: "No contract balance indicators in filing corpus",
    };
  }

  const balanceDetail = balances
    ? ` Contract assets $${balances.contract_assets}; contract liabilities $${balances.contract_liabilities}.`
    : "";
  return {
    emitterId: "contract-balances-rollforward",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "contract-balances-rollforward",
        citation: CITATION,
        text: `Contract assets and contract liabilities rollforward disclosed per ${CITATION_RESOLVED}, including billings in excess of costs.${balanceDetail}`,
      },
    ],
  };
}
