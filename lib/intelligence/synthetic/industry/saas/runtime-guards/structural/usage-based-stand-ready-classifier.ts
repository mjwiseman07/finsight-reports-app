import { assertContainsSaaSARRData } from "../../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../../audit/saas-audit-emitter";

export function runUsageBasedStandReadyClassifier(
  ctx: { containsSaaSARRData?: boolean },
  input: { violation?: boolean },
  emitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.violation) {
    emitter.emitArrMrr("rejected-escalation", { guard: "usage-based-stand-ready-classifier", input });
    throw Object.assign(new Error("SAAS_GUARD_VIOLATION"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_GUARD_VIOLATION", message: "usage-based-stand-ready-classifier" }],
    });
  }
  return { guard: "usage-based-stand-ready-classifier", ok: true };
}

