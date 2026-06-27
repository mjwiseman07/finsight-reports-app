import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import { createPsAuditEmitter, emitDualAudit } from "../audit/ps-audit-emitter";
import type { PsAuditEmitter } from "../audit/ps-audit-emitter";

export function evaluate(
  ctx: { containsProfessionalEngagementData?: boolean },
  input: Record<string, unknown>,
  emitter: PsAuditEmitter = createPsAuditEmitter(),
) {
  assertContainsProfessionalEngagementData(ctx);
  
  if (input.subSegment === "E" && !input.sealPresent) {
    emitDualAudit(emitter, { code: "PS_PE_SEAL_FAIL", message: "PE seal required for E" });
    throw Object.assign(new Error("PS_PE_SEAL_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_PE_SEAL_FAIL", message: "E" }],
    });
  }
  emitter.emitEngagementLetter("pe-seal-gate-evaluated", { module: "pe-seal-gate", input });
  return { ok: true };
}
