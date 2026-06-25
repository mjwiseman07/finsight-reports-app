/**
 * Phase 42.7D.1-audit — Org-Edge Reconciliation Audit Retrofit
 * Doctrine:
 *  - builderNeverAuthorsContent: true (no business content authored by builder)
 *  - isNotReplacementForHuman: true (reconciliation supports, not replaces, controller judgment)
 *  - humanWorkerParityDoctrine: true (org authority modeled on attested elections)
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - pureInnerCoreUntouched: true (deterministic logic byte-identical to 20b4bdf)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 */
export {
  detectDisagreementPure as detectDisagreement,
} from "./orgStandardsEdgePure";
export type { CuratedRulesProjection } from "./orgStandardsEdgePure";
