/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * K-H 340B segregation — HRSA_340B citation handle.
 */

import type { HCAuditEmitter } from "../audit/hc-audit-emitter";
import { emitOrgEdgeAudit } from "../audit/hc-audit-emitter";
import { Diversion340BViolation } from "../kernel/errors";

export function assert340bInventoryTransition(
  drugId: string,
  fromPool: "340b" | "commercial",
  toPool: "340b" | "commercial",
  hasTransferEntry: boolean,
  emitter: HCAuditEmitter,
  params: { entityId: string; tenantId: string },
): void {
  if (fromPool === "340b" && toPool === "commercial" && !hasTransferEntry) {
    throw Diversion340BViolation(
      `340B drug ${drugId} cannot move to commercial inventory without transfer entry`,
    );
  }
  emitOrgEdgeAudit(emitter, {
    entityId: params.entityId,
    tenantId: params.tenantId,
    category: "340B",
    capabilityKey: "340b-pricing",
  });
}

export function assert340bEligibleEncounter(
  encounter340bEligible: boolean,
  attributing340bRevenue: boolean,
): void {
  if (attributing340bRevenue && !encounter340bEligible) {
    throw Diversion340BViolation("340B revenue from ineligible patient encounter");
  }
}

export function assert340bSubSegmentEligibility(
  subSegmentEligible: boolean,
  capabilityRequested: boolean,
): void {
  if (capabilityRequested && !subSegmentEligible) {
    throw Diversion340BViolation("340B retrieval blocked for non-eligible sub-segment");
  }
}
