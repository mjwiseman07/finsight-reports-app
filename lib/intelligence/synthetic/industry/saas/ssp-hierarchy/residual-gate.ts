import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function assertResidualGate(
  ctx: { containsSaaSARRData?: boolean },
  input: { observableExists: boolean; useResidual: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.observableExists && input.useResidual) {
    emitter.emitArrMrr("ssp-residual-bypass", input);
    throw Object.assign(new Error("SAAS_SSP_RESIDUAL_BYPASS"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_SSP_RESIDUAL_BYPASS", message: "residual" }],
    });
  }
  return { gatePassed: true };
}

