/** Barrel export — containsVerticalComplianceLogic: false (SOC 1 readiness namespace). */
export {
  assertPhiFlagged,
  getDeclaredBoundary,
  socScopeBoundary,
  SOC_BOUNDARY_TAXONOMY_TAGS,
  type BoundaryAssertionResult,
  type BoundaryDiagramInput,
  type DeclaredBoundary,
  type SocScopeBoundary,
  type SocScopeBoundaryMarker,
} from "./socScopeBoundary";

export {
  executeSocScopeBoundaryStaticConstructionTests,
  SOC_SCOPE_BOUNDARY_STATIC_CONSTRUCTION_CASES,
  type SocScopeBoundaryStaticConstructionCase,
  type SocScopeBoundaryStaticConstructionCaseResult,
} from "./socScopeBoundaryStaticConstructionTests";
