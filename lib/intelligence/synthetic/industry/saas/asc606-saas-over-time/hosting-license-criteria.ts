import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../audit/saas-audit-emitter";

export function evaluateHostingLicenseCriteria(
  ctx: { containsSaaSARRData?: boolean },
  input: { separatelyIdentifiable: boolean; distinctInContext: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  const pass = input.separatelyIdentifiable && input.distinctInContext;
  emitter.emitArrMrr(pass ? "hosting-distinct-from-license" : "hosting-distinct-from-license-failure", input);
  if (!pass) {
    throw Object.assign(new Error("SAAS_HOSTING_LICENSE_FAIL"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_HOSTING_LICENSE_FAIL", message: "bifurcation" }],
    });
  }
  return { distinct: true };
}

