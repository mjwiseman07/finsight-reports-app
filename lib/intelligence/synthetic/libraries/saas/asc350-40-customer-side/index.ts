import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
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

