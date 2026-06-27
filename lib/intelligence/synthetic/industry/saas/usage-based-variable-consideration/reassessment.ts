import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function reassessUsageConsideration(
  ctx: { containsSaaSARRData?: boolean },
  input: Record<string, unknown>,
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  emitter.emitArrMrr("usage-classified-measure-of-progress", { module: "usage-based-variable-consideration-reassessment", input });
  return { ok: true };
}
