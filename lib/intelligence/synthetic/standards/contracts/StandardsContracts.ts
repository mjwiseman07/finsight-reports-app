import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../../actions/contracts";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";

export type StandardsReportingFramework =
  | "us_gaap"
  | "ifrs_for_smes"
  | "ifrs_iasb"
  | "ifrs_eu"
  | "ifrs_uk"
  | "ifrs_ca"
  | "ifrs_au"
  | "frs_102"
  | "de_hgb"
  | "br_gaap"
  | "local_other";

export type FrameworkRegistryStatus = "active" | "in_review" | "recognized_unpopulated" | "deprecated";

export type StandardsTreatmentStatus = "draft" | "in_review" | "active" | "superseded";

export type ConsolidationMethod = "full" | "equity" | "proportionate" | "none";

export type DifferenceDirection = "timing" | "recognition" | "measurement" | "disclosure" | "classification";

export type StandardsMaterialityFlag = "high" | "medium" | "low";

export type FrameworkChangeType = "primary_change" | "secondary_add" | "secondary_remove";

export interface StandardsBaseContract {
  phase40OrganizationalHandoffHandle: string;
  phase40_5IntegrationHandoffHandle: string;
  boundPhase40SnapshotHash: string;
  boundPhase40_5SnapshotHash: string;
  boundPhase39SnapshotHash: string;
  boundPhase38SnapshotHash: string;
  phase41_5StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: boolean;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  // reportingFramework is a scoping dimension, not a fourth isolation peer.
  reportingFramework: StandardsReportingFramework;
  // Fail closed: if PHI sensitivity cannot be determined, containsPHI defaults to true.
  containsPHI: boolean;
  derivationLineageIds: string[];
  derivationMethod: SyntheticActionDerivationMethod;
  derivationHash: string;
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  evidenceReferenceIds: string[];
  lineageReferenceIds: string[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  warnings: string[];
  skippedIndexes: number[];
}

export interface StandardsTreatmentContract extends StandardsBaseContract {
  treatmentId: string;
  treatmentKey: string;
  topicIdentifier: string;
  reportingFramework: StandardsReportingFramework;
  citationReference: string;
  treatmentSummary: string;
  disclosureRequirementReferenceIds: string[];
  commonPitfalls: string[];
  version: string;
  effectiveFromDate: string;
  isHumanReviewed: boolean;
  reviewerIdentity: string;
  reviewDate: string;
  containsCopyrightedText: false;
  treatmentStatus: StandardsTreatmentStatus;
  priorVersionReferenceId: string;
  appendOnlyHistory: true;
}

export interface FrameworkRegistryContract extends StandardsBaseContract {
  frameworkRegistryId: string;
  frameworkRegistryKey: string;
  frameworkIdentifier: StandardsReportingFramework;
  frameworkStatus: FrameworkRegistryStatus;
  selectableOnlyWhenActive: true;
  failClosedOnNonActiveSelection: true;
  statusTransitionIsGovernedEvent: true;
}

export interface TreatmentCitationContract extends StandardsBaseContract {
  citationId: string;
  citationKey: string;
  treatmentId: string;
  standardReference: string;
  isReferenceOnlyNeverReproducedText: true;
}

export interface FrameworkSelectionContract extends StandardsBaseContract {
  frameworkSelectionId: string;
  frameworkSelectionKey: string;
  entityId: string;
  selectedFrameworkIdentifier: StandardsReportingFramework;
  selectionFailsClosedIfNotActive: true;
}

export interface EntityFrameworkConfigurationContract extends StandardsBaseContract {
  entityFrameworkConfigId: string;
  entityFrameworkConfigKey: string;
  entityId: string;
  primaryReportingFramework: StandardsReportingFramework;
  secondaryReportingFrameworks: StandardsReportingFramework[];
  functionalCurrency: string;
  presentationCurrency: string;
  consolidationMethod: ConsolidationMethod;
  parentEntityId: string;
  ownershipPercentage: number;
  frameworkSetPerEntityNotPerCompany: true;
  frameworkChangeRequiresGovernance: true;
  configurationImmutableAfterOnboardingLock: true;
}

export interface TreatmentVersionContract extends StandardsBaseContract {
  treatmentVersionId: string;
  treatmentVersionKey: string;
  treatmentId: string;
  version: string;
  effectiveFromDate: string;
  supersedesVersionReferenceId: string;
  historicalResolutionByEffectiveDate: true;
  immutablePriorVersions: true;
}

export interface TreatmentReviewAttestationContract extends StandardsBaseContract {
  reviewAttestationId: string;
  reviewAttestationKey: string;
  treatmentId: string;
  reviewerIdentity: string;
  reviewDate: string;
  attestationRequiredBeforeActive: true;
  perTreatmentNotBulkFlag: true;
}

export interface ConversionAdjustmentContract extends StandardsBaseContract {
  conversionAdjustmentId: string;
  conversionAdjustmentKey: string;
  entityId: string;
  fromFramework: StandardsReportingFramework;
  toFramework: StandardsReportingFramework;
  differenceCatalogEntryReferenceId: string;
  glImpactMetadata: Record<string, unknown>;
  isConversionAdjustment: true;
  humanReviewRequiredBeforePosting: true;
  reversible: true;
  frameworkTaggedAtPosting: true;
  neverSilentlyMerged: true;
}

export interface DifferenceCatalogEntryContract extends StandardsBaseContract {
  differenceEntryId: string;
  differenceEntryKey: string;
  topicIdentifier: string;
  gaapTreatmentSummary: string;
  ifrsTreatmentSummary: string;
  differenceDirection: DifferenceDirection;
  materialityFlag: StandardsMaterialityFlag;
  conversionNotes: string;
  gaapCitation: string;
  ifrsCitation: string;
  applicableJurisdictionalVariants: StandardsReportingFramework[];
  isHumanReviewed: boolean;
  reviewerIdentity: string;
  reviewDate: string;
  containsCopyrightedText: false;
}

export interface FrameworkChangeRequestContract extends StandardsBaseContract {
  frameworkChangeRequestId: string;
  frameworkChangeRequestKey: string;
  entityId: string;
  changeType: FrameworkChangeType;
  reasonCode: string;
  conversionImpactAnalysisReferenceId: string;
  requiresMultiPartyApproval: boolean;
  approverReferenceIds: string[];
  historicalBooksRemainImmutable: true;
  changeLogEntryReferenceId: string;
  changeLogAppendOnlyImmutable: true;
}

export interface DisclosureRequirementContract extends StandardsBaseContract {
  disclosureRequirementId: string;
  disclosureRequirementKey: string;
  treatmentId: string;
  reportingFramework: StandardsReportingFramework;
  disclosureSummary: string;
  frameworkTaggedNeverBleedsAcrossFrameworks: true;
}
