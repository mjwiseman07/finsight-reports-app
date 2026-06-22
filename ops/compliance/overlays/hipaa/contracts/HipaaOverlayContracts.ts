/**
 * Phase 42.5J — HIPAA Overlay Contracts (type-only).
 * Overlay namespace only — HIPAA semantics stay on the overlay side of the spine seam.
 * Current final HIPAA rule (45 CFR Part 164 as in force). NPRM items are NOT asserted as law here.
 */

import type {
  ControlSpineContractIsolationFields,
  OverlayAttachmentContract,
} from "../../../../control-spine/contracts";

/** Discriminator — overlay contracts must never be confused with spine contracts. */
export type HipaaOverlayContractMarker = {
  overlayContract: true;
  containsVerticalComplianceLogic: true;
  executable: false;
};

/** Opaque HIPAA overlay registry key — binds through spine OverlayAttachmentContract slot only. */
export type HipaaOverlayRegistryKey = "overlay:hipaa";

export type HipaaOverlayInterfaceSlotReferenceKey =
  | "audit_logging_event_interface"
  | "breach_detection_signal_interface"
  | "regulated_compliant_audit_store_interface";

export type HipaaRegulatoryBasisStatus = "current_final_rule";

export type HipaaNprmPendingRegulatoryBasisStatus = "nprm_pending_not_current_rule";

/** NPRM (RIN 0945-AA22) gaps belong in 42.5W — not current-rule contract requirements. */
export interface HipaaNprmPendingRequirementMarker {
  nprmPendingRequirementMarkerId: string;
  nprmPendingRequirementMarkerKey: string;
  overlayContract: true;
  containsVerticalComplianceLogic: true;
  executable: false;
  nprmReference: "RIN_0945_AA22";
  regulatoryBasisStatus: HipaaNprmPendingRegulatoryBasisStatus;
  gapRegisterConsumerModule: "42.5W";
  requirementDescriptionReferenceId: string;
}

export type HipaaOverlayRegulatorySubpartKey = "164_subpart_a" | "164_subpart_c";

export type HipaaOverlayExplicitNonCoverageCategory =
  | "soc_2_controls"
  | "pci_dss_controls"
  | "clinical_data_workflow_controls"
  | "non_healthcare_tenant_operations"
  | "spine_universal_controls";

/**
 * FM-3 scope statement — declares HIPAA overlay regulatory coverage AND explicit non-coverage.
 * Consumed by 42.5H FM-3 enforcement via spine regulatoryScopeStatementReferenceId linkage.
 */
export interface HipaaOverlayScopeContract extends HipaaOverlayContractMarker {
  hipaaOverlayScopeContractId: string;
  hipaaOverlayScopeContractKey: string;
  regulatoryBasisStatus: HipaaRegulatoryBasisStatus;
  /** Current-rule anchor — 45 CFR 164 Subparts A/C as in force (not NPRM-as-law). */
  regulatoryAuthorityCitation: "45 CFR Part 164 Subparts A and C";
  coveredSubpartKeys: readonly [HipaaOverlayRegulatorySubpartKey, HipaaOverlayRegulatorySubpartKey];
  scopeCoverageStatementReferenceId: string;
  scopeCoverageSummaryReferenceId: string;
  explicitNonCoverageCategories: readonly HipaaOverlayExplicitNonCoverageCategory[];
  scopeNonCoverageStatementReferenceId: string;
  /** Opaque spine seam ref — maps to OverlayAttachmentContract.regulatoryScopeStatementReferenceId */
  spineRegulatoryScopeStatementReferenceId: string;
}

/** FM-3 alias — same artifact as HipaaOverlayScopeContract. */
export type HipaaScopeStatement = HipaaOverlayScopeContract;

export type HipaaPhiDataClassReferenceKey =
  | "phi"
  | "electronic_phi"
  | "phi_derived_learning_boundary";

/** Type-only PHI data-class marker for overlay-side PHI path routing (not spine-owned). */
export interface HipaaPhiDataClassReferenceContract extends HipaaOverlayContractMarker {
  hipaaPhiDataClassReferenceContractId: string;
  hipaaPhiDataClassReferenceContractKey: string;
  phiDataClassKey: HipaaPhiDataClassReferenceKey;
  phiDataClassReferenceId: string;
  handlingPathReferenceId: string;
}

export type HipaaCurrentRuleSafeguardCitationKey =
  | "45_cfr_164_308"
  | "45_cfr_164_310"
  | "45_cfr_164_312"
  | "45_cfr_164_314"
  | "45_cfr_164_316";

export type HipaaSafeguardCategoryKey =
  | "administrative"
  | "physical"
  | "technical"
  | "organizational"
  | "documentation";

/**
 * Type-only safeguard hook reference — implementation deferred to 42.5K.
 * Current-rule citations only; no NPRM-only safeguard assertions.
 */
export interface HipaaSafeguardReferenceContract extends HipaaOverlayContractMarker {
  hipaaSafeguardReferenceContractId: string;
  hipaaSafeguardReferenceContractKey: string;
  safeguardCategory: HipaaSafeguardCategoryKey;
  currentRuleCitation: HipaaCurrentRuleSafeguardCitationKey;
  safeguardHookReferenceId: string;
  implementationStatus: "type_reference_only";
  implementationConsumerModule: "42.5K";
}

/** Safeguard bundle shape per planning doc — references only, no runtime path. */
export interface HipaaSafeguardContract extends HipaaOverlayContractMarker {
  hipaaSafeguardContractId: string;
  hipaaSafeguardContractKey: string;
  administrativeSafeguardReferenceIds: string[];
  physicalSafeguardReferenceIds: string[];
  technicalSafeguardReferenceIds: string[];
  organizationalSafeguardReferenceIds: string[];
  documentationSafeguardReferenceIds: string[];
}

export type HipaaBaaExecutionReadinessStatus =
  | "not_executed"
  | "pending_countersignature"
  | "executed_current_rule";

/** BAA execution readiness metadata — overlay-side legal wrapper, not spine logic. */
export interface BaaExecutionContract extends HipaaOverlayContractMarker {
  baaExecutionContractId: string;
  baaExecutionContractKey: string;
  regulatoryBasisStatus: HipaaRegulatoryBasisStatus;
  coveredEntityReferenceId: string;
  businessAssociateReferenceId: string;
  baaArtifactReferenceId: string;
  executionReadinessStatus: HipaaBaaExecutionReadinessStatus;
  effectiveDateReferenceId: string | null;
}

export type HipaaBusinessAssociateRoleBasis = "45_cfr_160_103";

/** Advisacor BA role on PHI path — 160.103 basis, overlay-contained. */
export interface BusinessAssociateRoleContract extends HipaaOverlayContractMarker {
  businessAssociateRoleContractId: string;
  businessAssociateRoleContractKey: string;
  regulatoryBasisStatus: HipaaRegulatoryBasisStatus;
  businessAssociateRoleBasis: HipaaBusinessAssociateRoleBasis;
  businessAssociateEntityReferenceId: string;
  phiPathParticipationReferenceId: string;
  minimumNecessaryPolicyReferenceId: string;
}

/**
 * HIPAA overlay identity + attachment shape — plugs into spine OverlayAttachmentContract slot.
 * Spine sees opaque refs; HIPAA semantics remain in this overlay namespace.
 */
export interface HipaaOverlayContract extends ControlSpineContractIsolationFields, HipaaOverlayContractMarker {
  hipaaOverlayContractId: string;
  hipaaOverlayContractKey: string;
  overlayRegistryKey: HipaaOverlayRegistryKey;
  /** Opaque spine attachment contract reference — no spine-internal reach. */
  spineOverlayAttachmentContractReferenceId: string;
  /** Declared attachment seam shape — generic slot binding only. */
  boundOverlayAttachmentContractShape: Pick<
    OverlayAttachmentContract,
    | "overlayAttachmentReferenceId"
    | "activationScopeReferenceId"
    | "regulatoryScopeStatementReferenceId"
    | "precedenceConfigurationReferenceId"
    | "overlayInterfaceSlotReferenceIds"
  >;
  hipaaScopeStatementReferenceId: string;
  overlayInterfaceSlotReferenceIds: readonly HipaaOverlayInterfaceSlotReferenceKey[];
  phiDataClassReferenceIds: string[];
  safeguardBundleReferenceId: string;
  baaExecutionReferenceId: string;
  businessAssociateRoleReferenceId: string;
  /** Optional NPRM-pending markers — not current-rule requirements (42.5W owns gaps). */
  nprmPendingRequirementMarkerReferenceIds: string[];
}
