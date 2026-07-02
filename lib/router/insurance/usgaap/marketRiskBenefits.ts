/**
 * Market Risk Benefits (MRB) — post-LDTI priority rule.
 * Per ASC 944-40-25-25C and ASU 2018-12, the MRB test must be applied BEFORE
 * the ASC 815-15 embedded derivative test for variable annuity features.
 */
import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { assertLongDurationForLdtiEmitter, assertMarketRiskFeatureForMrb } from "../forbidden";
import type { InsuranceEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/insurance/usgaap/marketRiskBenefits.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 944",
  paragraphs: ["944-40-25-25C", "ASU 2018-12 MRB"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export type MarketRiskBenefitsEmitterResult = EmitterResult & {
  mrbApplicable: boolean;
};

export function emitMarketRiskBenefits(input: InsuranceEmitterInput): MarketRiskBenefitsEmitterResult {
  const ins = input.insurance;
  if (!ins.hasLongDurationContracts || !ins.hasMarketRiskFeature) {
    throw new MissingDisclosureInputError("insurance.longDuration.mrbFairValue");
  }
  assertLongDurationForLdtiEmitter(ins, "marketRiskBenefits");
  assertMarketRiskFeatureForMrb(ins);

  const mrbFairValue = ins.longDuration?.mrbFairValue;
  const mrbApplicable = typeof mrbFairValue === "number" && mrbFairValue > 0;

  if (!mrbApplicable) {
    return {
      emitterId: "market-risk-benefits",
      emitterPath: EMITTER_PATH,
      status: "fail-closed",
      lines: [],
      failureReason: "MRB test not applicable — no mrbFairValue on long-duration block",
      mrbApplicable: false,
    };
  }

  const text = `Market risk benefits fair value $${mrbFairValue!.toLocaleString()} recognized before embedded derivative evaluation per ${CITATION_RESOLVED} (post-LDTI MRB priority over ASC 815-15).`;
  return {
    emitterId: "market-risk-benefits",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "market-risk-benefits", citation: CITATION, text }],
    mrbApplicable: true,
  };
}
