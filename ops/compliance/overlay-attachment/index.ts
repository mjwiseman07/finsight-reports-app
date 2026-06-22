export {
  appendOverlayActivationRecord,
  buildOverlayActivationRecord,
  createOverlayActivationRegistry,
  detectNonOverlayAttachmentCoverage,
  resolveOverlayActivation,
  tenantActivationScopeFromContract,
  type BuildOverlayActivationRecordInput,
  type OverlayActivationRecord,
  type OverlayActivationRecordBuildResult,
  type OverlayActivationRecordStatus,
  type OverlayActivationRegistry,
  type OverlayActivationResolutionOutcome,
  type OverlayActivationResolutionReason,
  type OverlayActivationResolutionResult,
  type OverlayTenantActivationScope,
  type ResolveOverlayActivationInput,
} from "./overlayActivationRegistry";

export {
  executeOverlayAttachmentAuditArtifactSmokeTest,
  executeOverlayAttachmentStaticConstructionTests,
  OVERLAY_ATTACHMENT_STATIC_CONSTRUCTION_CASES,
  type OverlayAttachmentStaticConstructionCase,
  type OverlayAttachmentStaticConstructionCaseResult,
} from "./overlayAttachmentStaticConstructionTests";
