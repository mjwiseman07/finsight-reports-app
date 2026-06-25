/**
 * Phase 42.7C.2 — Panel Decision Audit Retrofit
 * Doctrine:
 *  - builderNeverAuthorsContent: true (no business content authored by builder)
 *  - isNotReplacementForHuman: true (panel selections support, not replace, controller judgment)
 *  - humanWorkerParityDoctrine: true (panel authority modeled on AICPA CGMA framework)
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - pureInnerCoreUntouched: true (panel-consumer deterministic logic byte-identical to c8bddc8)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 *  - advisoryBundlingDoctrine: true (one panel call = one audit entry; advisories bundled)
 */
export {
  createCapabilityGatePure as createCapabilityGate,
  inferCapabilityId,
} from "./capabilityGatePure";
export type { CapabilityGate, CapabilityGateDeps } from "./capabilityGatePure";
