import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function recognizeOverTime(
  ctx: { containsSaaSARRData?: boolean },
  input: { standReady: boolean; c1?: boolean; c2?: boolean; c3?: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  const pass = input.standReady && (input.c1 || input.c2 || input.c3);
  emitter.emitArrMrr(pass ? "over-time-criterion-met" : "over-time-criterion-rejected", input);
  if (!pass) {
    throw Object.assign(new Error("SAAS_OVER_TIME_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_OVER_TIME_FAIL", message: "over-time" }],
    });
  }
  return { recognized: true };
}

