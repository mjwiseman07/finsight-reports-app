import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import { createPsAuditEmitter, emitDualAudit } from "../audit/ps-audit-emitter";
import type { PsAuditEmitter } from "../audit/ps-audit-emitter";

export function evaluate(
  ctx: { containsProfessionalEngagementData?: boolean },
  input: Record<string, unknown>,
  emitter: PsAuditEmitter = createPsAuditEmitter(),
) {
  assertContainsProfessionalEngagementData(ctx);
  
  emitter.emitEngagementLetter("principal-vs-agent-evaluated", { module: "principal-vs-agent", input });
  return { ok: true };
}
