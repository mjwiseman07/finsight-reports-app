import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../types";
import { PayorMixIncompleteError, PreAsc606BadDebtModelError } from "../errors";
import { assertUsgaapHcRevenueOutputNonComingling } from "../forbidden";
import {
  HC_BAD_DEBT_PCT_REJECT_THRESHOLD,
  HC_FOOTING_TOLERANCE_USD,
  US_GAAP_ASC606,
  type HealthcareRevenueEmitterInput,
} from "../types";

export const EMITTER_PATH = "lib/router/lanes/healthcare/emitters/allowanceRollforward.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 326",
  paragraphs: ["326-20-50-4", "606 residual collectibility"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

function assertFramework(input: HealthcareRevenueEmitterInput): void {
  if (input.framework !== US_GAAP_ASC606) {
    throw new PayorMixIncompleteError("framework gate");
  }
}

export function emitAllowanceRollforward(input: HealthcareRevenueEmitterInput): EmitterResult {
  assertFramework(input);
  const roll = input.extracted.healthcare_revenue?.asc606?.allowance_rollforward;
  if (!roll) {
    throw new PayorMixIncompleteError("healthcare_revenue.asc606.allowance_rollforward");
  }

  const computed =
    roll.opening_balance +
    roll.additions_bad_debt_expense -
    roll.write_offs +
    roll.recoveries;
  if (Math.abs(computed - roll.closing_balance) > HC_FOOTING_TOLERANCE_USD) {
    throw new PayorMixIncompleteError("allowance rollforward footing");
  }

  const badDebtPct = roll.additions_bad_debt_expense / roll.net_patient_service_revenue;
  if (badDebtPct > HC_BAD_DEBT_PCT_REJECT_THRESHOLD) {
    throw new PreAsc606BadDebtModelError(badDebtPct);
  }

  const text =
    `Residual allowance for doubtful accounts (post-ASC 606 CECL): opening $${roll.opening_balance.toLocaleString("en-US")}, ` +
    `additions charged to provision for doubtful accounts $${roll.additions_bad_debt_expense.toLocaleString("en-US")}, ` +
    `write-offs $${roll.write_offs.toLocaleString("en-US")}, recoveries $${roll.recoveries.toLocaleString("en-US")}, ` +
    `closing $${roll.closing_balance.toLocaleString("en-US")} per ${CITATION_RESOLVED}. ` +
    `Residual collectibility expense ${(badDebtPct * 100).toFixed(2)}% of net patient service revenue.`;
  assertUsgaapHcRevenueOutputNonComingling(text);

  return {
    emitterId: "allowance-rollforward",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "bad-debt-vs-charity", citation: CITATION, text }],
  };
}
