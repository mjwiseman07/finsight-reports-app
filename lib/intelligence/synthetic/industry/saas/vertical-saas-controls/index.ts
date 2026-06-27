import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter, emitDualAudit } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function evaluate(
  ctx: { containsSaaSARRData?: boolean },
  input: Record<string, unknown>,
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.subSegment === "V" && (!input.hipaaBaa || !input.soc1Type2)) {
    emitDualAudit(emitter, { code: "SAAS_VERTICAL_CONTROLS_FAIL", message: "HIPAA+SOC1 required for V" });
    throw Object.assign(new Error("SAAS_VERTICAL_CONTROLS_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_VERTICAL_CONTROLS_FAIL", message: "V" }],
    });
  }
  if (input.subSegment === "V" && input.highRiskPhi && !input.hipaaBaa) {
    emitDualAudit(emitter, { code: "SAAS_VERTICAL_PHI_FAIL", message: "HIPAA required for high-risk V" });
    throw Object.assign(new Error("SAAS_VERTICAL_PHI_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_VERTICAL_PHI_FAIL", message: "V" }],
    });
  }
  emitter.emitArrMrr("soc2-p-evaluated", { module: "vertical-saas-controls", input });
  return { ok: true };
}
