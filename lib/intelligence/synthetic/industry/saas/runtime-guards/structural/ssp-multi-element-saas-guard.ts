import { assertContainsSaaSARRData } from "../../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../../audit/saas-audit-emitter";

export function runSspMultiElementSaasGuard(
  ctx: { containsSaaSARRData?: boolean },
  input: { violation?: boolean },
  emitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.violation) {
    emitter.emitArrMrr("rejected-escalation", { guard: "ssp-multi-element-saas-guard", input });
    throw Object.assign(new Error("SAAS_GUARD_VIOLATION"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_GUARD_VIOLATION", message: "ssp-multi-element-saas-guard" }],
    });
  }
  return { guard: "ssp-multi-element-saas-guard", ok: true };
}

