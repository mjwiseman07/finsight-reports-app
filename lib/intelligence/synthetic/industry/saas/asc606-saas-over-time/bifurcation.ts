import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function bifurcateRampDeal(
  ctx: { containsSaaSARRData?: boolean },
  input: { rampEscalation: boolean; bifurcated: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.rampEscalation && !input.bifurcated) {
    emitter.emitArrMrr("ramp-deal-no-bifurcation", input);
    throw Object.assign(new Error("SAAS_RAMP_NO_BIFURCATION"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_RAMP_NO_BIFURCATION", message: "ramp" }],
    });
  }
  emitter.emitArrMrr("ramp-deal-bifurcated", input);
  return { bifurcated: true };
}

