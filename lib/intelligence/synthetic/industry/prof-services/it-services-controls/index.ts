import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import { createPsAuditEmitter, emitDualAudit } from "../audit/ps-audit-emitter";
import type { PsAuditEmitter } from "../audit/ps-audit-emitter";

export function evaluate(
  ctx: { containsProfessionalEngagementData?: boolean },
  input: Record<string, unknown>,
  emitter: PsAuditEmitter = createPsAuditEmitter(),
) {
  assertContainsProfessionalEngagementData(ctx);
  
  if (input.subSegment === "I" && (!input.soc2Type2 || !input.hipaaBaa || !input.gdprArt28)) {
    emitDualAudit(emitter, { code: "PS_IT_CONTROLS_FAIL", message: "SOC/HIPAA/GDPR stack required for I" });
    throw Object.assign(new Error("PS_IT_CONTROLS_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_IT_CONTROLS_FAIL", message: "I" }],
    });
  }
  emitter.emitEngagementLetter("it-services-controls-evaluated", { module: "it-services-controls", input });
  return { ok: true };
}
