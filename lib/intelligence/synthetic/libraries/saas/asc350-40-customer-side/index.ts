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
import { resolveSaasCitationHandle } from "../handles";

export function applyCustomerSideCapGate(
  ctx: { containsSaaSARRData?: boolean },
  input: { serviceContractEvidence: boolean },
  _emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (!input.serviceContractEvidence) {
    throw Object.assign(new Error("SAAS_ASC350_CUSTOMER_SIDE_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_ASC350_CUSTOMER_SIDE_FAIL", message: "350-40" }],
    });
  }
  return { handle: resolveSaasCitationHandle("ASC.350-40-25-1"), capitalized: true };
}

