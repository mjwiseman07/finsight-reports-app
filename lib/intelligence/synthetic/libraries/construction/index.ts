/**
 * @doctrine containsConstructionContractData: true
 * @audit-channel poc-progress-audit (introduced in CON-2 — emitted via factory once channel exists)
 * @framework us-gaap | ifrs (resolved at runtime via LOCK-41.5 treatment-resolver — switch wired in CON-2)
 * @sub-segments G | S | R | C | H | D
 * @last-verified 2026-06-26
 * @spec Phase_CON_1_Recon_Spec.md v1.0
 */

import type { ConstructionSubSegmentId, ConstructionSubSegmentKernel } from "./types";
import { ConstructionSubSegmentNotFound } from "./errors";
import { CONSTRUCTION_CITATION_HANDLE_COUNT, resolveConstructionCitationHandle } from "./handles";

export const CONSTRUCTION_SUB_SEGMENT_KERNELS: Record<ConstructionSubSegmentId, ConstructionSubSegmentKernel> = {
  G: { subSegmentId: "G", name: "General Contractor", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
  S: { subSegmentId: "S", name: "Subcontractor", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
  R: { subSegmentId: "R", name: "Residential", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: false },
  C: { subSegmentId: "C", name: "Commercial / Industrial", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
  H: { subSegmentId: "H", name: "Heavy Civil / Infrastructure", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
  D: { subSegmentId: "D", name: "Specialty Design-Build", frameworks: ["US_GAAP", "IFRS"], overTimeDefault: true },
};

export function listConstructionSubSegmentIds(): ConstructionSubSegmentId[] {
  return Object.keys(CONSTRUCTION_SUB_SEGMENT_KERNELS) as ConstructionSubSegmentId[];
}

export function getConstructionSubSegment(id: ConstructionSubSegmentId): ConstructionSubSegmentKernel {
  const kernel = CONSTRUCTION_SUB_SEGMENT_KERNELS[id];
  if (!kernel) throw ConstructionSubSegmentNotFound(id);
  return kernel;
}

export function assertConstructionHandleCountFloor(floor: number): boolean {
  if (CONSTRUCTION_CITATION_HANDLE_COUNT < floor) {
    throw Object.assign(new Error(`Handle count ${CONSTRUCTION_CITATION_HANDLE_COUNT} < floor ${floor}`), {
      escalationAudits: [{ channel: "escalation-audit", code: "CON_HANDLE_COUNT_FLOOR", message: "Handle count below floor" }],
    });
  }
  return true;
}

export { resolveConstructionCitationHandle, CONSTRUCTION_CITATION_HANDLE_COUNT };
export { evaluateOverTimeCriteria } from "./asc606/over-time-criteria";
export { evaluateUninstalledMaterialsGate } from "./asc606/uninstalled-materials";
export { routeModification } from "./asc606/modifications";
export { classifyRetention } from "./asc606/contract-balances";
export { assertProportionateConsolidationLockout } from "./asc810/jv-consolidation";
export { evaluateCipImpairmentDelay } from "./asc360/cip-impairment";
export { evaluateGuaranteeAtInception } from "./asc460/guarantees";
export { evaluateShortTermException } from "./asc842/leases";
export { evaluateAmortizationMatch } from "./asc340-40/contract-costs";
