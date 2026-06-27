/**
 * @doctrine containsProfessionalEngagementData: true
 * @audit-channel engagement-letter-audit (introduced in PS-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in PS-2)
 * @sub-segments L | A | M | I | E | K
 * @last-verified 2026-06-26
 * @spec Phase_PS_1_Recon_Spec.md v1.0
 */

import type { ProfServicesSubSegmentId, ProfServicesSubSegmentKernel } from "./types";
import { ProfServicesViolation } from "./errors";
import { PROF_SERVICES_CITATION_HANDLE_COUNT, resolveProfServicesCitationHandle } from "./handles";

export const PROF_SERVICES_SUB_SEGMENT_KERNELS: Record<ProfServicesSubSegmentId, ProfServicesSubSegmentKernel> = {
  L: { subSegmentId: "L", name: "Law", frameworks: ["US_GAAP", "IFRS"] },
  A: { subSegmentId: "A", name: "Accounting-Advisory", frameworks: ["US_GAAP", "IFRS"] },
  M: { subSegmentId: "M", name: "Mgmt-Consulting", frameworks: ["US_GAAP", "IFRS"] },
  I: { subSegmentId: "I", name: "IT-Services", frameworks: ["US_GAAP", "IFRS"] },
  E: { subSegmentId: "E", name: "Engineering-Architecture", frameworks: ["US_GAAP", "IFRS"] },
  K: { subSegmentId: "K", name: "Marketing-Creative", frameworks: ["US_GAAP", "IFRS"] },
};

export function listProfServicesSubSegmentIds(): ProfServicesSubSegmentId[] {
  return Object.keys(PROF_SERVICES_SUB_SEGMENT_KERNELS) as ProfServicesSubSegmentId[];
}

export function getProfServicesSubSegment(id: ProfServicesSubSegmentId) {
  const k = PROF_SERVICES_SUB_SEGMENT_KERNELS[id];
  if (!k) throw ProfServicesViolation("PS_SUBSEGMENT_NOT_FOUND", `Unknown sub-segment ${id}`);
  return k;
}

export function assertProfServicesHandleCountFloor(floor: number): boolean {
  if (PROF_SERVICES_CITATION_HANDLE_COUNT < floor) {
    throw Object.assign(new Error("PS_HANDLE_COUNT_FLOOR"), {
      escalationAudits: [{ channel: "escalation-audit", code: "PS_HANDLE_COUNT_FLOOR", message: "count below floor" }],
    });
  }
  return true;
}

export { resolveProfServicesCitationHandle, PROF_SERVICES_CITATION_HANDLE_COUNT };
export * from "./asc606/over-time-criteria";
export * from "./asc606/retainer-series";
export * from "./asc606/contingent-success-fees";
export * from "./asc606/multi-element-ssp";
export * from "./asc606/principal-vs-agent";
export * from "./specialized/pe-seal";
export * from "./specialized/engagement-letter";
