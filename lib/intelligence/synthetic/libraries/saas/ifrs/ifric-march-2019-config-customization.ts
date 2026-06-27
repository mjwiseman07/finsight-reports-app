import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";

export function evaluateIfricMarch2019(
  ctx: { containsSaaSARRData?: boolean },
  input: { ias38Met: boolean; expensedWithoutTest?: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.expensedWithoutTest) {
    emitter.emitArrMrr("ifric-march-2019-bypass", input);
    throw Object.assign(new Error("SAAS_IFRIC_MARCH2019_BYPASS"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_IFRIC_MARCH2019_BYPASS", message: "march2019" }],
    });
  }
  emitter.emitArrMrr("ifric-march-2019-applied", input);
  return { capitalized: input.ias38Met };
}
