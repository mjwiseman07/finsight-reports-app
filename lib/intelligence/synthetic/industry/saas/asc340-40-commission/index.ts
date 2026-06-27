import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function capitalizeCommission(
  ctx: { containsSaaSARRData?: boolean },
  input: { incremental: boolean; expensedInPeriod?: boolean; justification?: string },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.expensedInPeriod && !input.justification) {
    emitter.emitArrMrr("commission-expensed-no-justification", input);
    throw Object.assign(new Error("SAAS_COMMISSION_EXPENSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_COMMISSION_EXPENSED", message: "commission" }],
    });
  }
  emitter.emitArrMrr("commission-capitalized", input);
  return { capitalized: true };
}

