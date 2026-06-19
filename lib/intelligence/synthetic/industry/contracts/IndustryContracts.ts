import type { SyntheticActionDerivationMethod, SyntheticPhase38StaleMarker } from "../../actions/contracts";
import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditScope,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticKnowledgeConfidenceFloorMetadata } from "../../knowledge/contracts";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";
import type { StandardsReportingFramework } from "../../standards/contracts";

export type IndustryStatus = "active" | "in_review" | "recognized_unpopulated" | "deprecated";

export type IndustryTreatmentStatus = "draft" | "in_review" | "active" | "superseded" | "deprecated";

export type IndustryCompositionOutcome = "specializes" | "specializesWithDisplacement" | "contradiction";

export type IndustryResolutionStatus = "resolved" | "fail_closed";

export type IndustryResolutionFailClosedReason =
  | "none"
  | "industry_not_active"
  | "subclassification_not_declared"
  | "framework_not_active"
  | "tuple_unpopulated"
  | "specialist_attestation_missing";

export type PhiDerivationStatus =
  | "containsNoPHI"
  | "derivedFromPHIThroughSafeHarbor"
  | "derivedFromPHIThroughExpertDetermination"
  | "containsPHI";

export type RecommendationOutputClassification = "recommendation_for_human_review";

export type IndustryKpiClassification = "revenueCycle" | "operational" | "aggregateOnly";

export type BaselineSourceType = "external" | "internal_research";

export type AnalyticComponentScope = "industry_agnostic" | "industry_scoped";

export interface PrimaryReviewer {
  identity: string;
  credentials: string[];
  reviewDate: string;
  scope: string;
}

export interface SpecialistReviewer {
  identity: string;
  credentials: string[];
  specialization: string;
  reviewDate: string;
}

export interface SpecialistReviewOptOutJustification {
  justification: string;
  attestor: string;
  attestationDate: string;
  reviewSampleEligible: true;
}

export interface ReviewerAttestation {
  primaryReviewer: PrimaryReviewer;
  specialistReviewRequired: boolean;
  specialistReviewer: SpecialistReviewer | null;
  attestationStatement: string;
  reviewedAgainstAuthoritativeSources: string[];
  specialistReviewOptOutJustification: SpecialistReviewOptOutJustification | null;
}

export interface SpecialistCredentialRequirements {
  requiredCredentials: string[];
  requiredSpecialization: string;
  namedCredentialRequiredFor340B: boolean;
}

export interface IndustryRoutingRule {
  routingRuleIdentifier: string;
  inScopeTestDescription: string;
  outOfScopeTestDescription: string;
  scopeBoundaryAttestationReferenceId: string;
}

export interface IndustryPerTopicDeclaration {
  topicIdentifier: string;
  requiresSpecialistReview: boolean;
  specialistCredentialRequirements: SpecialistCredentialRequirements;
  authoritativeSourcesRequired: string[];
  routingRules: IndustryRoutingRule[];
}

export interface DisplacementLineageEntry {
  displacedFrameworkElementId: string;
  displacedElementVersion: string;
  displacedElementEffectiveDate: string;
  displacingIndustryElementId: string;
  displacingElementVersion: string;
  authoritativeCitationRef: string;
  specialistAttestationRef: string;
}

export interface ExternalBaselineSource {
  sourceType: "external";
  externalSourceReference: string;
}

export interface InternalResearchBaselineSource {
  sourceType: "internal_research";
  methodologyDescription: string;
  sampleDescription: string;
  statisticalBasis: string;
  limitations: string;
}

export type IndustryBaselineSource = ExternalBaselineSource | InternalResearchBaselineSource;

export interface IndustryBaseContract {
  phase40OrganizationalHandoffHandle: string;
  phase40_5IntegrationHandoffHandle: string;
  phase41_5StandardsHandoffHandle: string;
  boundPhase40SnapshotHash: string;
  boundPhase40_5SnapshotHash: string;
  boundPhase41_5SnapshotHash: string;
  boundPhase39SnapshotHash: string;
  phase42StaleMarker: SyntheticPhase38StaleMarker;
  executable: false;
  executionReady: boolean;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  // industryClassification and industrySubClassification are scoping dimensions, not isolation peers.
  reportingFramework: StandardsReportingFramework;
  industryClassification: string;
  industrySubClassification: string;
  industryStatus: IndustryStatus;
  // Fail closed: if PHI sensitivity cannot be determined, containsPHI defaults to true.
  containsPHI: boolean;
  // Fail closed: if phiDerivationStatus cannot be determined, default to the most-restrictive applicable value (containsPHI).
  phiDerivationStatus: PhiDerivationStatus;
  output_classification: RecommendationOutputClassification;
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

export interface IndustryTreatmentContract extends IndustryBaseContract {
  industryTreatmentId: string;
  industryTreatmentKey: string;
  topicIdentifier: string;
  treatmentSummaryAuthored: string;
  citationReference: string;
  containsCopyrightedText: false;
  reviewerAttestation: ReviewerAttestation;
  requiresSpecialistReview: boolean;
  version: string;
  effectiveFromDate: string;
  deprecatedFromDate?: string;
  treatmentStatus: IndustryTreatmentStatus;
  activeRequiresAttestation: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  priorVersionReferenceId: string;
}

export interface IndustryRegistryContract extends IndustryBaseContract {
  industryRegistryId: string;
  industryRegistryKey: string;
  industryIdentifier: string;
  subClassifications: string[];
  selectableOnlyWhenActive: true;
  failClosedOnNonActiveSelection: true;
  neverSilentlyFallsBackToGeneric: true;
  statusTransitionIsGovernedEvent: true;
  moduleSpecialistReviewDefault: boolean;
  perTopicDeclarations: IndustryPerTopicDeclaration[];
}

export interface IndustryCitationContract extends IndustryBaseContract {
  citationId: string;
  citationKey: string;
  industryTreatmentId: string;
  sourceReference: string;
  isReferenceOnlyNeverReproducedText: true;
}

export interface IndustrySelectionContract extends IndustryBaseContract {
  industrySelectionId: string;
  industrySelectionKey: string;
  entityId: string;
  selectedIndustry: string;
  selectedSubClassification: string;
  selectionFailsClosedIfNotActive: true;
  selectionFailsClosedIfSubClassificationNotDeclared: true;
  industrySetPerEntityNotPerCustomer: true;
  changeRequiresGovernance: true;
  effectiveFromDate: string;
}

export interface IndustryResolutionContract extends IndustryBaseContract {
  industryResolutionId: string;
  industryResolutionKey: string;
  queryTopicIdentifier: string;
  queryIndustry: string;
  querySubClassification: string;
  queryFramework: StandardsReportingFramework;
  queryEffectiveDate: string;
  resolvedTreatmentReferenceId: string;
  resolutionStatus: IndustryResolutionStatus;
  failClosedReason: IndustryResolutionFailClosedReason;
  failsClosedOnSpecialistAttestationMissing: true;
  rolesNeverCallIndustryContentDirectly: true;
}

export interface IndustryCompositionContractBase extends IndustryBaseContract {
  industryCompositionId: string;
  industryCompositionKey: string;
  queryTopicIdentifier: string;
  queryIndustry: string;
  querySubClassification: string;
  queryFramework: StandardsReportingFramework;
  queryEffectiveDate: string;
}

export interface IndustryCompositionSpecializesContract extends IndustryCompositionContractBase {
  compositionOutcome: "specializes";
  frameworkSourceReferenceId: string;
  industrySourceReferenceId: string;
  differencesCatalogConsultationReferenceId?: string;
  resolvedTreatmentReferenceId: string;
  compositionIsDeterministic: true;
  reconstructionGradeLineage: true;
  phiDerivationStatusPropagatesMostRestrictive: true;
}

export interface IndustryCompositionSpecializesWithDisplacementContract
  extends IndustryCompositionContractBase {
  compositionOutcome: "specializesWithDisplacement";
  displacementLineage: [DisplacementLineageEntry, ...DisplacementLineageEntry[]];
  displacementJustification: string;
  specialistReviewerRequiredForDisplacement: true;
  frameworkSourceReferenceId: string;
  industrySourceReferenceId: string;
  differencesCatalogConsultationReferenceId?: string;
  resolvedTreatmentReferenceId: string;
}

export interface IndustryCompositionContradictionContract extends IndustryCompositionContractBase {
  compositionOutcome: "contradiction";
  contradictionEmitsConflictReportNeverResolves: true;
  conflictReportReferenceId: string;
  frameworkChangeGovernanceReferenceId: string;
}

export type IndustryCompositionContract =
  | IndustryCompositionSpecializesContract
  | IndustryCompositionSpecializesWithDisplacementContract
  | IndustryCompositionContradictionContract;

export interface PHITagContract extends IndustryBaseContract {
  phiTagId: string;
  phiTagKey: string;
  artifactReferenceId: string;
  taggedAtCreationNotRetroactively: true;
  triggeredByDataCharacteristicsNotIndustryLabelAlone: true;
  neverCrossesCustomerIsolation: true;
  neverAppearsInNonHealthcareAwareRetrieval: true;
  carriesRedactionMetadata: true;
  auditTrailEntriesInheritPhiTag: true;
  conservativeDefaultTagWhenUncertain: true;
}

export interface IndustryKPIContract extends IndustryBaseContract {
  industryKpiId: string;
  industryKpiKey: string;
  kpiTopicIdentifier: string;
  kpiClassification: IndustryKpiClassification;
  minimumCellSize: number;
  belowMinimumCellSizeSuppressedOrRolledUp: true;
  loweringMinimumCellSizeRequiresExpertDetermination: true;
  reviewerAttestation: ReviewerAttestation;
  citationReference: string;
}

export interface IndustryDisclosureContract extends IndustryBaseContract {
  industryDisclosureId: string;
  industryDisclosureKey: string;
  topicIdentifier: string;
  linkedTreatmentReferenceId: string;
  disclosureSummaryAuthored: string;
  composesWithPhase41_5DisclosureRequirements: true;
  frameworkTaggedNeverBleedsAcrossFrameworks: true;
  industryTaggedNeverBleedsAcrossIndustries: true;
  reviewerAttestation: ReviewerAttestation;
  citationReference: string;
  containsCopyrightedText: false;
}

export interface IndustryReasonablenessContract extends IndustryBaseContract {
  industryReasonablenessId: string;
  industryReasonablenessKey: string;
  baselineTopicIdentifier: string;
  baselineSource: IndustryBaselineSource;
  internalResearchRequiresSpecialistReview: true;
  internalResearchCarriesSofterSignalLabel: true;
  isBaselineNotHardLimit: true;
  flagsAnomaliesForHumanReviewNotErrors: true;
  reviewerAttestation: ReviewerAttestation;
  version: string;
  effectiveFromDate: string;
}

export interface AgnosticScopedDeclarationContract extends IndustryBaseContract {
  agnosticScopedDeclarationId: string;
  agnosticScopedDeclarationKey: string;
  analyticCategory: string;
  algorithmScope: AnalyticComponentScope;
  baselineParametersScope: AnalyticComponentScope;
  normalizationRulesScope: AnalyticComponentScope;
  declaredPerComponentNotWholeCategory: true;
  isSourceOfTruthFor42GRetrieval: true;
}
