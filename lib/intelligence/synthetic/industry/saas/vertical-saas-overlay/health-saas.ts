import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function applyHealthSaaSOverlay(
  ctx: { containsSaaSARRData?: boolean; containsPHI?: boolean },
  input: { evidencePresent: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (!input.evidencePresent) {
    throw Object.assign(new Error("SAAS_VERTICAL_OVERLAY_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_VERTICAL_OVERLAY_FAIL", message: "health-saas.ts" }],
    });
  }
  emitter.emitArrMrr("vertical-saas-overlay-applied", { overlay: "health-saas.ts", ...input });
  return { applied: true };
}

