import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function allocateMaterialRightSSP(
  ctx: { containsSaaSARRData?: boolean },
  input: { materialRightDetected: boolean; sspAllocated: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.materialRightDetected && !input.sspAllocated) {
    emitter.emitArrMrr("material-right-not-detected", input);
    throw Object.assign(new Error("SAAS_MATERIAL_RIGHT_SSP_MISSING"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_MATERIAL_RIGHT_SSP_MISSING", message: "ssp" }],
    });
  }
  emitter.emitArrMrr("ssp-hierarchy-applied", input);
  return { allocated: true };
}

