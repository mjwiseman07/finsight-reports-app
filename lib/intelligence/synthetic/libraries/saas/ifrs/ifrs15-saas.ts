import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { resolveSaasCitationHandle } from "../handles";
import { createSaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";

export const IFRS15_SAAS_HANDLES = ["IFRS15.Page", "IFRS15.Para35-37", "IFRS15.Para56-58", "IFRS15.B34-B35"] as const;

export function evaluateIfrs15SaasConstraint(
  ctx: { containsSaaSARRData?: boolean },
  input: { highlyProbable: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (!input.highlyProbable) {
    emitter.emitArrMrr("framework-cross-blend", input);
    throw Object.assign(new Error("SAAS_IFRS_CONSTRAINT_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_IFRS_CONSTRAINT_FAIL", message: "ifrs15" }],
    });
  }
  return { handle: resolveSaasCitationHandle("IFRS15.Para56-58"), constrained: true };
}

export function resolveIfrs15SaasHandles() {
  return IFRS15_SAAS_HANDLES.map((h) => resolveSaasCitationHandle(h));
}
