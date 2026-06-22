export {
  classifyIsolationReach,
  evaluateIsolationBoundary,
  type ClassifyIsolationReachCore,
  type ClassifyIsolationReachInput,
  type ControlSpineIsolationAccessOutcome,
  type ControlSpineIsolationDenyReason,
  type ControlSpineIsolationEvaluationResult,
  type ControlSpineIsolationScope,
  type ControlSpineResourceVisibilityScope,
  type EvaluateIsolationBoundaryInput,
} from "./evaluateIsolationBoundary";

export {
  executeIsolationBoundaryAuditArtifactSmokeTest,
  executeIsolationBoundaryStaticConstructionTests,
  ISOLATION_BOUNDARY_STATIC_CONSTRUCTION_CASES,
  type IsolationBoundaryStaticConstructionCase,
  type IsolationBoundaryStaticConstructionCaseResult,
} from "./isolationBoundaryStaticConstructionTests";
