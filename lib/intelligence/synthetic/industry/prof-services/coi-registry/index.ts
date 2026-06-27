import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import { createPsAuditEmitter, emitDualAudit } from "../audit/ps-audit-emitter";
import type { PsAuditEmitter } from "../audit/ps-audit-emitter";

export function evaluate(
  ctx: { containsProfessionalEngagementData?: boolean },
  input: Record<string, unknown>,
  emitter: PsAuditEmitter = createPsAuditEmitter(),
) {
  assertContainsProfessionalEngagementData(ctx);
  
  if ((input.subSegment === "L" || input.subSegment === "A") && !input.coiDisclosed) {
    emitDualAudit(emitter, { code: "PS_COI_STRUCTURAL_FAIL", message: "COI structural required for L+A" });
    throw Object.assign(new Error("PS_COI_STRUCTURAL_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_COI_STRUCTURAL_FAIL", message: "L+A" }],
    });
  }
  if (input.subSegment === "M" && input.highRiskMatter && !input.coiDisclosed) {
    emitDualAudit(emitter, { code: "PS_COI_CONDITIONAL_FAIL", message: "COI required for high-risk M" });
    throw Object.assign(new Error("PS_COI_CONDITIONAL_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_COI_CONDITIONAL_FAIL", message: "M" }],
    });
  }
  emitter.emitEngagementLetter("coi-registry-evaluated", { module: "coi-registry", input });
  return { ok: true };
}
