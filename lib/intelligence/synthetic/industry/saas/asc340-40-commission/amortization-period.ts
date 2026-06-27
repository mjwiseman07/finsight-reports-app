import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function evaluateAmortizationPeriod(
  ctx: { containsSaaSARRData?: boolean },
  input: { contractTermOnly: boolean; includesRenewals: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.contractTermOnly && !input.includesRenewals) {
    emitter.emitArrMrr("commission-amortization-period-mismatch", input);
    throw Object.assign(new Error("SAAS_COMMISSION_AMORT_MISMATCH"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_COMMISSION_AMORT_MISMATCH", message: "amort" }],
    });
  }
  return { period: "customer-life" };
}

