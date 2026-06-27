import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import type { ProfServicesCrossBlendBasisType, ProfServicesFramework } from "./cross-blend-types";
import { ASC_IFRS_PS_PARITY_MAP } from "./parity-map";
import { defaultFramework } from "./back-compat-shim";
import { resolveProfServicesCitationHandle } from "../../../libraries/prof-services/handles";
import { createPsAuditEmitter } from "../audit/ps-audit-emitter";

export function routeByFramework(
  ctx: { containsProfessionalEngagementData?: boolean; framework?: ProfServicesFramework },
  basis: ProfServicesCrossBlendBasisType,
  emitter = createPsAuditEmitter(),
) {
  assertContainsProfessionalEngagementData(ctx);
  const framework = defaultFramework(ctx);
  if (basis.framework !== framework) {
    emitter.emitEngagementLetter("framework-switched", { requested: basis.framework, active: framework, handleId: basis.handleId });
    throw Object.assign(new Error("PS_FRAMEWORK_CROSS_BLEND_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_FRAMEWORK_CROSS_BLEND_REFUSED", message: basis.handleId }],
    });
  }
  if (framework === "US_GAAP" && basis.handleId.startsWith("IFRS")) {
    throw Object.assign(new Error("PS_IFRS_UNDER_US_GAAP_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_IFRS_UNDER_US_GAAP_REFUSED", message: basis.handleId }],
    });
  }
  emitter.emitEngagementLetter("handle-whitelist-validated", { handleId: basis.handleId, framework });
  return resolveProfServicesCitationHandle(basis.handleId);
}

export { ASC_IFRS_PS_PARITY_MAP, defaultFramework };
export * from "./cross-blend-types";

