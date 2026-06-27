import { assertContainsSaaSARRData } from "../../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../../audit/saas-audit-emitter";

export function runCommissionAmortizationPeriodGuard(
  ctx: { containsSaaSARRData?: boolean },
  input: { violation?: boolean },
  emitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.violation) {
    emitter.emitArrMrr("rejected-escalation", { guard: "commission-amortization-period-guard", input });
    throw Object.assign(new Error("SAAS_GUARD_VIOLATION"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_GUARD_VIOLATION", message: "commission-amortization-period-guard" }],
    });
  }
  return { guard: "commission-amortization-period-guard", ok: true };
}

