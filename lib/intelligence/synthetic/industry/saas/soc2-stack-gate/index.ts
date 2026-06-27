import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter, emitDualAudit } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function evaluate(
  ctx: { containsSaaSARRData?: boolean },
  input: Record<string, unknown>,
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (!input.ccEvaluated) {
    emitDualAudit(emitter, { code: "SAAS_SOC2_CC_FAIL", message: "SOC2 CC required" });
    throw Object.assign(new Error("SAAS_SOC2_CC_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_SOC2_CC_FAIL", message: "CC" }],
    });
  }
  if (input.subSegment === "H" && (!input.aEvaluated || !input.cEvaluated)) {
    emitDualAudit(emitter, { code: "SAAS_SOC2_AC_FAIL", message: "SOC2 A+C required for H" });
    throw Object.assign(new Error("SAAS_SOC2_AC_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_SOC2_AC_FAIL", message: "H" }],
    });
  }
  if (input.subSegment === "U" && input.paymentProcessing && !input.piEvaluated) {
    emitDualAudit(emitter, { code: "SAAS_SOC2_PI_FAIL", message: "SOC2 PI required for payment U" });
    throw Object.assign(new Error("SAAS_SOC2_PI_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_SOC2_PI_FAIL", message: "U" }],
    });
  }
  emitter.emitArrMrr("soc2-cc-evaluated", { module: "soc2-stack-gate", input });
  return { ok: true };
}
