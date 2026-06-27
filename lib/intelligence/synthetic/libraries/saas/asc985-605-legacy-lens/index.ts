import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { createSaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import type { SaasAuditEmitter } from "../../industry/saas/audit/saas-audit-emitter";
import { resolveSaasCitationHandle } from "../handles";

export function applyLegacyLens(
  ctx: { containsSaaSARRData?: boolean },
  input: { subSegment: "H" | string; bifurcated: boolean },
  emitter: SaasAuditEmitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  if (input.subSegment === "H" && !input.bifurcated) {
    emitter.emitArrMrr("hosting-distinct-from-license-failure", input);
    throw Object.assign(new Error("SAAS_LEGACY_LENS_BIFURCATION_REQUIRED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_LEGACY_LENS_BIFURCATION_REQUIRED", message: "H" }],
    });
  }
  return { handle: resolveSaasCitationHandle("ASC.985-20-25-1"), applied: true };
}

