import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../../audit/saas-audit-emitter";

export function runMaterialRightDetector(
  ctx: { containsSaaSARRData?: boolean },
  input: { violation?: boolean },
  emitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.violation) {
    emitter.emitArrMrr("rejected-escalation", { guard: "material-right-detector", input });
    throw Object.assign(new Error("SAAS_GUARD_VIOLATION"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_GUARD_VIOLATION", message: "material-right-detector" }],
    });
  }
  return { guard: "material-right-detector", ok: true };
}

