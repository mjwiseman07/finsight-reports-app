import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function applySSPHierarchy(
  ctx: { containsSaaSARRData?: boolean },
  input: { observable?: number; adjustedMarket?: number; residual?: number },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.observable) {
    emitter.emitArrMrr("ssp-hierarchy-applied", { tier: "observable", ...input });
    return { tier: "observable", amount: input.observable };
  }
  if (input.adjustedMarket) {
    emitter.emitArrMrr("ssp-hierarchy-applied", { tier: "adjusted-market", ...input });
    return { tier: "adjusted-market", amount: input.adjustedMarket };
  }
  if (input.residual !== undefined) {
    emitter.emitArrMrr("ssp-hierarchy-applied", { tier: "residual", ...input });
    return { tier: "residual", amount: input.residual };
  }
  emitter.emitArrMrr("ssp-residual-bypass", input);
  throw Object.assign(new Error("SAAS_SSP_HIERARCHY_FAIL"), {
    escalationAudits: [{ channel: "escalation-audit", code: "SAAS_SSP_HIERARCHY_FAIL", message: "ssp" }],
  });
}

