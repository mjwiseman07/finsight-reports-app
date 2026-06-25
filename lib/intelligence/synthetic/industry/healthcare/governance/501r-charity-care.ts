/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsPHI: true
 *
 * K-H 501(r) charity care segregation — IRS_501R citation handle.
 */

import type { HCAuditEmitter } from "../audit/hc-audit-emitter";
import { emitEscalationAudit } from "../audit/hc-audit-emitter";
import { CharityCareSegregationViolation } from "../kernel/errors";
import { assert501rExplicitConfig } from "../kernel/hc-framework-binding";
import type { HealthcarePanelContext } from "../../contracts/healthcare/HCBasisContracts";

export function assertCharityCareWriteOffCompliance(
  context: HealthcarePanelContext,
  policyCompliant: boolean,
): void {
  assert501rExplicitConfig(context);
  if (!policyCompliant) {
    throw CharityCareSegregationViolation("Charity care write-off without 501(r) policy compliance");
  }
}

export function escalateCharityCareReclassifiedAsBadDebt(
  emitter: HCAuditEmitter,
  params: { entityId: string; tenantId: string; writeOffId: string },
): void {
  emitEscalationAudit(emitter, {
    entityId: params.entityId,
    tenantId: params.tenantId,
    reason: `Charity care write-off ${params.writeOffId} reclassified as bad debt`,
    severity: "high",
    violationType: "CharityCareSegregationViolation",
  });
}
