import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertIfrsSaasOutputNonComingling } from "../forbidden";
import {
  hasContractBalances,
  hasDeferredRevenueRollforward,
  type SaasEmitterInput,
} from "../types";

export const EMITTER_PATH = "lib/router/saas/ifrs/contractAssetLiabilitySplit.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 15",
  paragraphs: ["105", "106", "107", "108", "109"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

export function emitContractAssetLiabilitySplit(input: SaasEmitterInput): EmitterResult {
  const { extracted } = input;
  if (!hasContractBalances(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.contract_asset/contract_liability");
  }
  if (!hasDeferredRevenueRollforward(extracted)) {
    throw new MissingDisclosureInputError("contract_revenue.deferred_revenue_rollforward");
  }

  const asset = extracted.contract_revenue!.contract_asset!;
  const liability = extracted.contract_revenue!.contract_liability!;
  const roll = extracted.contract_revenue!.deferred_revenue_rollforward!;

  const splitText = `Contract assets of EUR ${asset.current} and contract liabilities of EUR ${liability.current} presented per ${CITATION_RESOLVED}.`;
  assertIfrsSaasOutputNonComingling(splitText);

  const rollText = `Contract liability rollforward: opening EUR ${roll.beginning_balance}, additions EUR ${roll.revenue_deferred}, revenue recognized EUR ${roll.revenue_recognized}, closing EUR ${roll.ending_balance} per ${CITATION_RESOLVED}.`;
  assertIfrsSaasOutputNonComingling(rollText);

  return {
    emitterId: "contract-asset-liability-split",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      { assertionId: "contract-asset-liability-split", citation: CITATION, text: splitText },
      { assertionId: "deferred-revenue-rollforward", citation: CITATION, text: rollText },
    ],
  };
}
