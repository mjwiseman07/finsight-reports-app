import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertUsgaapSaasOutputNonComingling } from "../forbidden";
import {
  hasContractBalances,
  hasDeferredRevenueRollforward,
  type SaasEmitterInput,
} from "../types";

export const EMITTER_PATH = "lib/router/saas/usgaap/contractAssetLiabilitySplit.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 606",
  paragraphs: ["606-10-45-1", "606-10-45-5"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

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

  const splitText = `Contract assets of $${asset.current} (current) and contract liabilities of $${liability.current} (current) disclosed per ${CITATION_RESOLVED}.`;
  assertUsgaapSaasOutputNonComingling(splitText);

  const rollText = `Deferred revenue rollforward: beginning $${roll.beginning_balance}, deferred $${roll.revenue_deferred}, recognized $${roll.revenue_recognized}, ending $${roll.ending_balance} per ${CITATION_RESOLVED}.`;
  assertUsgaapSaasOutputNonComingling(rollText);

  return {
    emitterId: "contract-asset-liability-split",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [
      {
        assertionId: "contract-asset-liability-split",
        citation: CITATION,
        text: splitText,
      },
      {
        assertionId: "deferred-revenue-rollforward",
        citation: CITATION,
        text: rollText,
      },
    ],
  };
}
