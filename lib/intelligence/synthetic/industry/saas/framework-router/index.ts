import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import type { SaaSCrossBlendBasisType, SaaSFramework } from "./cross-blend-types";
import { ASC_IFRS_SAAS_PARITY_MAP } from "./parity-map";
import { defaultFramework } from "./back-compat-shim";
import { resolveSaasCitationHandle } from "../../../libraries/saas/handles";
import { createSaasAuditEmitter } from "../audit/saas-audit-emitter";

export function routeByFramework(
  ctx: { containsSaaSARRData?: boolean; framework?: SaaSFramework },
  basis: SaaSCrossBlendBasisType,
  emitter = createSaasAuditEmitter(),
) {
  assertContainsSaaSARRData(ctx);
  const framework = defaultFramework(ctx);
  if (basis.framework !== framework) {
    emitter.emitArrMrr("framework-cross-blend", { requested: basis.framework, active: framework, handleId: basis.handleId });
    throw Object.assign(new Error("SAAS_FRAMEWORK_CROSS_BLEND_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_FRAMEWORK_CROSS_BLEND_REFUSED", message: basis.handleId }],
    });
  }
  if (framework === "US_GAAP" && basis.handleId.startsWith("IFRS")) {
    throw Object.assign(new Error("SAAS_IFRS_UNDER_US_GAAP_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_IFRS_UNDER_US_GAAP_REFUSED", message: basis.handleId }],
    });
  }
  emitter.emitArrMrr("framework-switched", { handleId: basis.handleId, framework, switchPointId: basis.switchPointId });
  return resolveSaasCitationHandle(basis.handleId);
}

export { ASC_IFRS_SAAS_PARITY_MAP, SAAS_FRAMEWORK_SWITCH_POINT_COUNT } from "./switch-points";
export { defaultFramework } from "./back-compat-shim";
export * from "./cross-blend-types";
export * from "./switch-points";

