/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { resolveSaasCitationHandle } from "../handles";
import { SaasViolation } from "../errors";
import { SAAS_KF_DISCRIMINATED_POINTS } from "./k-f-discriminated-points";

export type SaasFramework = "US_GAAP" | "IFRS";

export function switchSaasFramework(
  ctx: { containsSaaSARRData?: boolean; framework?: SaasFramework },
  pointId: string,
  emitter?: { emit: (outcome: string, evidence: Record<string, unknown>) => void },
) {
  assertContainsSaaSARRData(ctx);
  const framework = ctx.framework ?? "US_GAAP";
  const point = SAAS_KF_DISCRIMINATED_POINTS.find((p) => p.pointId === pointId);
  if (!point) throw SaasViolation("SAAS_KF_POINT_NOT_FOUND", pointId);
  const handleId = framework === "IFRS" ? point.ifrsHandle : point.usGaapHandle;
  if (emitter) {
    emitter.emit("framework-switched", { framework, pointId, handleId });
  } else {
    throw SaasViolation("SAAS_KF_SWITCH_NO_AUDIT", "Framework switch requires audit emission");
  }
  return resolveSaasCitationHandle(handleId);
}
