/**
 * Public consumption barrel for Phase 42.5B/C/P spine isolation helpers.
 * Composition modules MUST import from this barrel — never from internal spine paths.
 * containsVerticalComplianceLogic: false
 * executable: false
 */
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
} from "../../../../ops/control-spine/isolation";

export {
  classifyPersonaPermission,
  evaluateRbacAccess,
  type ClassifyPersonaPermissionCore,
  type ClassifyPersonaPermissionInput,
  type ControlSpineRbacAccessOutcome,
  type ControlSpineRbacDenyReason,
  type ControlSpineRbacEvaluationResult,
  type ControlSpineRbacRequestedAction,
  type ControlSpineRbacResourceDescriptor,
  type EvaluateRbacAccessInput,
} from "../../../../ops/control-spine/rbac";

export {
  buildActivationScopeFromTenantId,
  buildIsolationScopeFromTenantId,
  createPanelDataPathHarness,
  panelDataPathHarness,
  type PanelAssertionResult,
  type PanelDataPathHarness,
  type PanelDataPathInput,
} from "../../../../ops/control-spine/verification/panel-data-paths";
