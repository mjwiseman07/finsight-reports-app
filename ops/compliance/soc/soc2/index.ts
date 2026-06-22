/** Barrel export — containsVerticalComplianceLogic: false (SOC 2 readiness namespace). */
export {
  assertTscBoundaryAligned,
  getDeclaredTscScope,
  tscScopeBoundary,
  type DeclaredTscScope,
  type TscBoundaryAssertionResult,
  type TscBoundaryInput,
  type TscCriterion,
  type TscScopeBoundary,
  type TscScopeBoundaryMarker,
} from "./tscScopeBoundary";

export {
  executeTscScopeBoundaryStaticConstructionTests,
  TSC_SCOPE_BOUNDARY_STATIC_CONSTRUCTION_CASES,
  type TscScopeBoundaryStaticConstructionCase,
  type TscScopeBoundaryStaticConstructionCaseResult,
} from "./tscScopeBoundaryStaticConstructionTests";
