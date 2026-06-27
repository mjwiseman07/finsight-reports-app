import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function evaluateStandReady(
  ctx: { containsSaaSARRData?: boolean },
  input: Record<string, unknown>,
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  emitter.emitArrMrr("usage-classified-stand-ready", { module: "usage-based-variable-consideration-stand-ready", input });
  return { ok: true };
}
