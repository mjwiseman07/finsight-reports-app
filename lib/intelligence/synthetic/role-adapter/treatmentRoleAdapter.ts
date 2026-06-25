/**
 * Phase 42.7B.1 — Escalation Audit Retrofit
 * Doctrine:
 *  - builderNeverAuthorsContent: true (no business content authored by builder)
 *  - isNotReplacementForHuman: true (escalation decisions support, not replace, controller judgment)
 *  - humanWorkerParityDoctrine: true (persona authority modeled on AICPA CGMA framework)
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - pureInnerCoreUntouched: true (escalation deterministic logic byte-identical to 1a3e09e)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 */
import { adaptTreatmentForRolePure } from "./adaptTreatmentForRolePure";
import type { BuildArgs } from "./adaptTreatmentForRolePure";
import type { RoleAdapterResult } from "./types";

export type { BuildArgs };

export function adaptTreatmentForRole(args: BuildArgs): RoleAdapterResult {
  return adaptTreatmentForRolePure(args);
}
