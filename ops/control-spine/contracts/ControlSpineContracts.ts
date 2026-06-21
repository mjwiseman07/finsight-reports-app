/**
 * Phase 42.5A — Control-Spine Contracts (type-only).
 * Universal control spine: vertical-agnostic. No builders, no runtime behavior.
 */

export interface ControlSpineIsolationDimension {
  isolationDimensionReferenceId: string;
  tenantScopeKey: string;
  boundaryReferenceIds: string[];
}

export interface ControlSpineContractIsolationFields {
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
}

export interface ControlSpineIsolationContract extends ControlSpineContractIsolationFields {
  isolationContractId: string;
  isolationContractKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  customerTenantId: string;
  firmTenantId: string;
  clientTenantId: string;
  isolationScopeReferenceId: string;
}

export type ControlSpinePersonaKey =
  | "firm_admin"
  | "firm_staff"
  | "client_controller"
  | "client_owner"
  | "business_owner"
  | "declared_persona";

export interface ControlSpinePersonaPermissionGrant {
  permissionGrantReferenceId: string;
  authorizedSurfaceReferenceId: string;
  grantScopeReferenceId: string;
}

export interface ControlSpinePersonaRbacMatrixEntry {
  personaKey: ControlSpinePersonaKey;
  personaReferenceId: string;
  denyByDefault: true;
  permissionGrants: ControlSpinePersonaPermissionGrant[];
}

export interface PersonaRbacMatrixContract extends ControlSpineContractIsolationFields {
  rbacMatrixContractId: string;
  rbacMatrixContractKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  matrixEntries: ControlSpinePersonaRbacMatrixEntry[];
}

export type ControlSpineAuditEventCategory =
  | "authentication"
  | "authorization"
  | "access"
  | "configuration"
  | "system"
  | "key_management";

export type ControlSpineAuditEventOutcome = "success" | "failure" | "denied";

export interface AuditEventContract extends ControlSpineContractIsolationFields {
  auditEventContractId: string;
  auditEventKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  eventCategory: ControlSpineAuditEventCategory;
  eventOutcome: ControlSpineAuditEventOutcome;
  actorReferenceId: string;
  targetResourceReferenceId: string;
  eventTimestampIso: string;
  /** FM-1 hook — retention values resolved elsewhere; spine stores reference only */
  retentionConfigurationReferenceId: string;
  auditTrailReferenceIds: string[];
}

export type ControlSpineEncryptionBoundaryKind = "at_rest" | "in_transit";

export interface ControlSpineEncryptionBoundaryMarker {
  boundaryMarkerReferenceId: string;
  boundaryKind: ControlSpineEncryptionBoundaryKind;
  keyScopeReferenceId: string;
}

export interface EncryptionKeyCustodyContract extends ControlSpineContractIsolationFields {
  keyCustodyContractId: string;
  keyCustodyContractKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  encryptionKeyReferenceId: string;
  custodyAuthorityReferenceId: string;
  rotationScheduleReferenceId: string;
  separationRuleReferenceIds: string[];
  boundaryMarkers: ControlSpineEncryptionBoundaryMarker[];
  keysDoNotCrossIsolationBoundaries: true;
}

export type ControlSpineAuthenticationMethodCategory =
  | "password"
  | "sso"
  | "api_token"
  | "session_cookie"
  | "other";

export interface AuthBoundaryContract extends ControlSpineContractIsolationFields {
  authBoundaryContractId: string;
  authBoundaryContractKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  sessionReferenceId: string;
  authenticatedPrincipalReferenceId: string;
  boundIsolationScopeReferenceId: string;
  authenticationMethodCategory: ControlSpineAuthenticationMethodCategory;
  failClosedOnAmbiguity: true;
  noAnonymousCrossTenantPaths: true;
}

export type ControlSpineOverlayAttachmentStatus = "inactive" | "active" | "pending_activation";

/**
 * Overlay attachment seam — the slot where a pluggable compliance overlay binds.
 * Spine defines the attachment point only; overlay semantics live under ops/compliance/overlays/.
 */
export interface OverlayAttachmentContract extends ControlSpineContractIsolationFields {
  overlayAttachmentContractId: string;
  overlayAttachmentContractKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  /** Opaque overlay registry key — vertical/regime naming belongs in overlay namespace, not here */
  overlayRegistryKey: string;
  overlayAttachmentReferenceId: string;
  activationScopeReferenceId: string;
  /** FM-3 — opaque reference to external scope-statement artifact; no regulatory text in spine */
  regulatoryScopeStatementReferenceId: string;
  /** FM-2 — opaque reference to precedence configuration; no conflict-resolution logic in spine */
  precedenceConfigurationReferenceId: string;
  attachmentStatus: ControlSpineOverlayAttachmentStatus;
  /** Opaque interface slot IDs for overlay module binding (42.5I / 42.5L consume) */
  overlayInterfaceSlotReferenceIds: string[];
}

export type ControlSpineRetentionPolicySource =
  | "spine_default"
  | "tenant_overlay"
  | "max_of_overlays";

export interface ControlSpineRetentionTier {
  retentionTierReferenceId: string;
  retentionTierKey: string;
  retentionDurationDays: number;
  logCategoryReferenceIds: string[];
}

export interface RetentionConfigurationContract extends ControlSpineContractIsolationFields {
  retentionConfigurationContractId: string;
  retentionConfigurationContractKey: string;
  containsVerticalComplianceLogic: false;
  executable: false;
  policySource: ControlSpineRetentionPolicySource;
  defaultRetentionTiers: ControlSpineRetentionTier[];
  /** FM-1 — overlay modules SET contribution refs externally; spine does not embed overlay logic */
  overlayRetentionContributionReferenceIds: string[];
  resolvedRetentionPolicyReferenceId: string;
}

/** Opaque overlay interface slots — 42.5L binds Phase 42Q-declared IDs without spine semantics */
export type ControlSpineOverlayInterfaceSlotKey =
  | "audit_logging_event_interface"
  | "breach_detection_signal_interface"
  | "regulated_compliant_audit_store_interface";

export interface ControlSpinePhase42OverlayInterfaceSlotBinding {
  slotKey: ControlSpineOverlayInterfaceSlotKey;
  interfaceReferenceId: string;
}

/** Phase 42 consumption markers (42H sensitivity tagging + 42Q overlay interface slots) */
export interface ControlSpinePhase42HandoffMarkers {
  boundPhase42SnapshotHash: string;
  /** 42H — opaque consumer reference; sensitivity classification is not spine-owned */
  sensitivityTaggingConsumptionReferenceId: string;
  overlayInterfaceSlotBindings: ControlSpinePhase42OverlayInterfaceSlotBinding[];
}

export interface ControlSpineUpstreamHandoffMarkers {
  boundPhase40SnapshotHash: string;
  boundPhase40_5SnapshotHash: string;
  boundPhase41_5SnapshotHash: string;
  boundPhase42SnapshotHash: string;
}
