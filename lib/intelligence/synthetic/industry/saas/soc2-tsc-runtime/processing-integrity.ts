import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function assertSoc2ProcessingIntegrity(
  ctx: { containsSaaSARRData?: boolean },
  input: { attested: boolean; paymentFlow?: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (!input.attested) {
    emitter.emitArrMrr("soc2-tsc-cc-violation", input);
    throw Object.assign(new Error("SAAS_SOC2_TSC_VIOLATION"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_SOC2_TSC_VIOLATION", message: "processing-integrity.ts" }],
    });
  }
  emitter.emitArrMrr("soc2-tsc-processing-integrity-asserted", input);
  return { attested: true };
}

