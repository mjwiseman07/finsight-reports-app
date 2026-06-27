import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import type { ConstructionCrossBlendBasisType, ConstructionFramework } from "./cross-blend-types";
import { ASC_IFRS_PARITY_MAP } from "./parity-map";
import { defaultFramework } from "./back-compat-shim";
import { resolveConstructionCitationHandle } from "../../../libraries/construction/handles";
import { createConAuditEmitter } from "../audit/con-audit-emitter";

export function routeByFramework(
  ctx: { containsConstructionContractData?: boolean; framework?: ConstructionFramework },
  basis: ConstructionCrossBlendBasisType,
  emitter = createConAuditEmitter(),
) {
  assertContainsConstructionContractData(ctx);
  const framework = defaultFramework(ctx);
  if (basis.framework !== framework) {
    emitter.emitPocProgress("framework-switched", { requested: basis.framework, active: framework, handleId: basis.handleId });
    throw Object.assign(new Error("CON_FRAMEWORK_CROSS_BLEND_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_FRAMEWORK_CROSS_BLEND_REFUSED", message: basis.handleId }],
    });
  }
  if (framework === "US_GAAP" && basis.handleId.startsWith("IFRS")) {
    throw Object.assign(new Error("CON_IFRS_UNDER_US_GAAP_REFUSED"), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_IFRS_UNDER_US_GAAP_REFUSED", message: basis.handleId }],
    });
  }
  return resolveConstructionCitationHandle(basis.handleId);
}

export { ASC_IFRS_PARITY_MAP, defaultFramework };
export * from "./cross-blend-types";

