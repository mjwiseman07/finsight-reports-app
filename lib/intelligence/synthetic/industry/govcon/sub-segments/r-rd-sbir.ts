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
  subSegmentId: "R";
  /** SBIR Phase I/II/III attributed inside R per Q9=A */
  sbirPhase?: "I" | "II" | "III";
}

export function activateRdSbirSubSegment(input: SubSegmentActivationInput, emitter: GcAuditEmitter) {
  const kernel = getGovConSubSegmentKernel("R");
  emitter.emitDcaaRateAudit({
    subSegmentId: "R",
    decisionType: "rate-resolution",
    evidence: { entityId: input.entityId, scope: kernel.description },
    outcome: "allowed",
    handleId: "FAR_31_SUBPART_2",
  });
  return { active: true, kernel };
}
