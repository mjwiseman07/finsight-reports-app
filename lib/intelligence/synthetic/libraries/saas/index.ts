/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */

import { assertContainsSaaSARRData } from "../../standards/doctrine/containsSaaSARRData";
import type { SaasSubSegmentId, SaasSubSegmentKernel } from "./types";
import { SaasViolation } from "./errors";
import { SAAS_CITATION_HANDLE_COUNT, resolveSaasCitationHandle } from "./handles";
import { SAAS_KF_DISCRIMINATED_POINTS } from "./frameworks/k-f-discriminated-points";

export const SAAS_SUB_SEGMENT_KERNELS: Record<SaasSubSegmentId, SaasSubSegmentKernel> = {
  P: { subSegmentId: "P", name: "Platform-SaaS", frameworks: ["US_GAAP", "IFRS"] },
  H: { subSegmentId: "H", name: "Hosting-Infra", frameworks: ["US_GAAP", "IFRS"] },
  U: { subSegmentId: "U", name: "Usage-Based", frameworks: ["US_GAAP", "IFRS"] },
  F: { subSegmentId: "F", name: "FinServ-SaaS", frameworks: ["US_GAAP", "IFRS"] },
  V: { subSegmentId: "V", name: "Vertical-SaaS", frameworks: ["US_GAAP", "IFRS"] },
};

export function listSaasSubSegmentIds(): SaasSubSegmentId[] {
  return Object.keys(SAAS_SUB_SEGMENT_KERNELS) as SaasSubSegmentId[];
}

export function getSaasSubSegment(ctx: { containsSaaSARRData?: boolean }, id: SaasSubSegmentId) {
  assertContainsSaaSARRData(ctx);
  const k = SAAS_SUB_SEGMENT_KERNELS[id];
  if (!k) throw SaasViolation("SAAS_SUBSEGMENT_NOT_FOUND", `Unknown sub-segment ${id}`);
  return k;
}

export function assertSaasHandleCountFloor(floor: number): boolean {
  if (SAAS_CITATION_HANDLE_COUNT < floor) {
    throw Object.assign(new Error("SAAS_HANDLE_COUNT_FLOOR"), {
      escalationAudits: [{ channel: "escalation-audit", code: "SAAS_HANDLE_COUNT_FLOOR", message: "count below floor" }],
    });
  }
  return true;
}

export { resolveSaasCitationHandle, SAAS_CITATION_HANDLE_COUNT, SAAS_KF_DISCRIMINATED_POINTS };
export * from "./asc606/subscription-over-time";
export * from "./asc606/hosting-vs-license";
export * from "./asc606/material-right-renewal";
export * from "./asc606/commission-amortization";
export * from "./asc606/multi-element-ssp";
export * from "./asc606/usage-stand-ready";
export * from "./asc606/contract-mods";
export * from "./classifiers/saas-sub-segment-classifier";
export * from "./frameworks/k-f-switch";
export * from "./specialized/soc2/common-criteria";
export * from "./specialized/soc2/processing-integrity";
export * from "./ifrs/ifrs15-saas";
export * from "./ifrs/ifric-march-2019-config-customization";
export * from "./ifrs/ifric-april-2021-cloud-customer";
export * from "./ifrs/ias38-internally-generated";
export * from "./asc985-605-legacy-lens";
export * from "./asc350-40-customer-side";
