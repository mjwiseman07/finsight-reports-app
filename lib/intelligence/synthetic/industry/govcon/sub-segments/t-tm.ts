/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

import type { GcAuditEmitter } from "../audit/gc-audit-emitter";
import { getGovConSubSegmentKernel } from "../../../standards/govcon";

export interface SubSegmentActivationInput {
  entityId: string;
  subSegmentId: "T";
}

export function activateTmSubSegment(input: SubSegmentActivationInput, emitter: GcAuditEmitter) {
  const kernel = getGovConSubSegmentKernel("T");
  emitter.emitDcaaRateAudit({
    subSegmentId: "T",
    decisionType: "rate-resolution",
    evidence: { entityId: input.entityId, scope: kernel.description },
    outcome: "allowed",
    handleId: "FAR_31_SUBPART_2",
  });
  return { active: true, kernel };
}
