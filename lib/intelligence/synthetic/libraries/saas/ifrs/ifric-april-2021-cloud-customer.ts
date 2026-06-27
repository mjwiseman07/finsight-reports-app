/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../../../industry/saas/audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../../../industry/saas/audit/saas-audit-emitter";

export function evaluateIfricApril2021(
  ctx: { containsSaaSARRData?: boolean },
  input: { serviceContract: boolean; bypassed?: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.bypassed) {
    emitter.emitArrMrr("ifric-april-2021-bypass", input);
    throw Object.assign(new Error("SAAS_IFRIC_APR2021_BYPASS"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_IFRIC_APR2021_BYPASS", message: "apr2021" }],
    });
  }
  emitter.emitArrMrr("ifric-april-2021-applied", input);
  return { serviceContract: input.serviceContract };
}
