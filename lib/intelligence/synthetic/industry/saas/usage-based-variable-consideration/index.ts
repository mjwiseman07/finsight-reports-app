import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function classifyUsage(
  ctx: { containsSaaSARRData?: boolean },
  input: { standReady?: boolean; measureOfProgress?: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.standReady === input.measureOfProgress) {
    throw Object.assign(new Error("SAAS_USAGE_UNDECIDABLE"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_USAGE_UNDECIDABLE", message: "usage" }],
    });
  }
  if (input.standReady) {
    emitter.emitArrMrr("usage-classified-stand-ready", input);
    return { classification: "stand-ready" };
  }
  emitter.emitArrMrr("usage-classified-measure-of-progress", input);
  return { classification: "measure-of-progress" };
}

