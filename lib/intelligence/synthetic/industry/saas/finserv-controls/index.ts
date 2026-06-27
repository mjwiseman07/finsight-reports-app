import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter, emitDualAudit } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function evaluate(
  ctx: { containsSaaSARRData?: boolean },
  input: Record<string, unknown>,
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.subSegment === "F" && (!input.aicpaCode || !input.soc1Type2)) {
    emitDualAudit(emitter, { code: "SAAS_FINSERV_CONTROLS_FAIL", message: "AICPA+SOC1 required for F" });
    throw Object.assign(new Error("SAAS_FINSERV_CONTROLS_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_FINSERV_CONTROLS_FAIL", message: "F" }],
    });
  }
  emitter.emitArrMrr("soc2-pi-evaluated", { module: "finserv-controls", input });
  return { ok: true };
}
