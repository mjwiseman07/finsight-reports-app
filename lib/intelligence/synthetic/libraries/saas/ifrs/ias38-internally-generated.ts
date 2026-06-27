/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { resolveSaasCitationHandle } from "../handles";
import { createSaasAuditEmitter } from "../../../industry/saas/audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../../../industry/saas/audit/saas-audit-emitter";

export const IAS38_SIX_CRITERIA = [
  "technicalFeasibility",
  "intentionToComplete",
  "abilityToUseOrSell",
  "futureEconomicBenefits",
  "availabilityOfResources",
  "reliableCostMeasurement",
] as const;

export function evaluateIas38Capitalization(
  ctx: { containsSaaSARRData?: boolean },
  criteria: Record<(typeof IAS38_SIX_CRITERIA)[number], boolean>,
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  IAS38_SIX_CRITERIA.forEach((key, index) => {
    if (criteria[key] !== true) {
      emitter.emitArrMrr(`ias38-criterion-${index + 1}-fail`, { criterion: key, criteria });
    }
  });
  const pass = IAS38_SIX_CRITERIA.every((k) => criteria[k] === true);
  if (!pass) {
    throw Object.assign(new Error("SAAS_IAS38_CAPITALIZATION_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_IAS38_CAPITALIZATION_REFUSED", message: "ias38" }],
    });
  }
  emitter.emitArrMrr("ias38-criterion-all-pass", { criteria, handle: resolveSaasCitationHandle("IAS38.Page") });
  return { capitalized: true };
}
