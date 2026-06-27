import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import { createPsAuditEmitter, emitDualAudit } from "../audit/ps-audit-emitter";
import type { PsAuditEmitter } from "../audit/ps-audit-emitter";

export function evaluate(
  ctx: { containsProfessionalEngagementData?: boolean },
  input: Record<string, unknown>,
  emitter: PsAuditEmitter = createPsAuditEmitter(),
) {
  assertContainsProfessionalEngagementData(ctx);
  
  emitter.emitEngagementLetter("variable-consideration-evaluated", { module: "variable-consideration", input });
  return { ok: true };
}
