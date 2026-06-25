/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * K-H CMS Cost Report Form 2552 event gating — stub for HC-3.
 * Citation: CMS_COST_REPORT_2552.
 */

import type { HCAuditEmitter } from "../audit/hc-audit-emitter";
import { emitPanelDecisionAudit } from "../audit/hc-audit-emitter";

export function gateCostReportReconciliationEvent(
  emitter: HCAuditEmitter,
  params: {
    entityId: string;
    tenantId: string;
    periodKey: string;
    basisDriftPct: number;
    thresholdPct: number;
  },
): { allowed: boolean; deferredToHc3: true } {
  if (params.basisDriftPct > params.thresholdPct) {
    emitPanelDecisionAudit(emitter, {
      entityId: params.entityId,
      tenantId: params.tenantId,
      decision: "CMS cost report reconciliation drift — HC-3 engine required",
      multiPartySignatures: ["controller", "compliance-officer"],
      flag: "cms-cost-report-drift",
    });
    return { allowed: false, deferredToHc3: true };
  }
  return { allowed: true, deferredToHc3: true };
}
