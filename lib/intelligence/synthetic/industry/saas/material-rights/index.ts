import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function detectMaterialRight(
  ctx: { containsSaaSARRData?: boolean },
  input: { renewalDiscountPct: number; threshold?: number },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  const threshold = input.threshold ?? 0.1;
  const detected = input.renewalDiscountPct >= threshold;
  emitter.emitArrMrr(detected ? "material-right-detected" : "material-right-not-detected", input);
  return { detected };
}

