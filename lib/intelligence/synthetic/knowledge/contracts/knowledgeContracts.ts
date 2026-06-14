import type {
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditLearningCompatibility,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditMemoryCompatibility,
  SyntheticAuditPackageCompatibility,
  SyntheticAuditPersonaCompatibility,
  SyntheticAuditScope,
  SyntheticAuditSurfaceCompatibility,
  SyntheticAuditTrustMetadata,
} from "../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../organizational-memory/memory-object";

export type SyntheticKnowledgeDerivationMethod =
  | "aggregation"
  | "generalization"
  | "categorization"
  | "relationship_preservation"
  | "historical_context_preservation"
  | "methodology_context_preservation";

export type SyntheticMethodologyDerivationMethod =
  | "knowledge_to_methodology"
  | "procedure_preservation"
  | "approach_preservation"
  | "review_method_preservation"
  | "operating_method_preservation"
  | "historical_methodology_preservation"
  | "methodology_relationship_preservation";

export type SyntheticKnowledgeStaleMarker = "current" | "stale" | "superseded" | "retracted_source_reference";

export type SyntheticMethodologyStaleMarker = "current" | "stale" | "superseded" | "retracted_source_reference";

export type SyntheticKnowledgeRelationshipCategory =
  | "knowledge_derivation_relationship"
  | "knowledge_context_relationship"
  | "knowledge_evidence_relationship"
  | "knowledge_memory_relationship"
  | "knowledge_methodology_context_relationship";

export type SyntheticKnowledgeRelationshipType =
  | "derived_from"
  | "contextualizes"
  | "preserves_relationship"
  | "supports"
  | "supersedes"
  | "is_superseded_by";

export type SyntheticMethodologyRelationshipCategory =
  | "methodology_derivation_relationship"
  | "methodology_lineage_relationship"
  | "methodology_evidence_relationship"
  | "methodology_knowledge_relationship"
  | "methodology_supersession_relationship";

export type SyntheticMethodologyRelationshipType =
  | "derived_from"
  | "preserves_approach"
  | "preserves_procedure"
  | "preserves_review_method"
  | "supersedes"
  | "is_superseded_by";

export interface SyntheticKnowledgeConfidenceFloorMetadata {
  confidenceFloorReferenceIds: string[];
  sourceConfidenceReferenceIds: string[];
  confidenceFloorBasis: "source_memory_minimum" | "source_knowledge_minimum" | "unknown_preserved";
}

export interface SyntheticKnowledgeValidityWindow {
  validFromReferenceId: string;
  validUntilReferenceId?: string;
  validityBasisReferenceIds: string[];
}

export interface SyntheticPhase37BaseKnowledgeArtifactContract {
  companyId: string;
  scope: SyntheticAuditScope;
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  sourceConfidenceReferenceIds: string[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityMetadata: SyntheticAuditMaterialityCompatibility[];
  personaCompatibility: SyntheticAuditPersonaCompatibility[];
  packageCompatibility: SyntheticAuditPackageCompatibility[];
  memoryCompatibility: SyntheticAuditMemoryCompatibility[];
  learningCompatibility: SyntheticAuditLearningCompatibility[];
  surfaceCompatibility: SyntheticAuditSurfaceCompatibility[];
}

export interface SyntheticPhase37NonExecutabilityContract {
  executable: false;
  actionReady: false;
  workflowReady: false;
  phase38Required: true;
}

export interface SyntheticKnowledgeDerivationContract {
  derivationLineageIds: string[];
  sourceMemoryObjectIds: string[];
  sourceMemoryRelationshipIds: string[];
  sourceEvidenceLineageGraphIds: string[];
  sourceOrganizationalMemoryPackageIds: string[];
  sourceOrganizationalMemoryGraphIds: string[];
  derivationMethod: SyntheticKnowledgeDerivationMethod;
  derivationHash: string;
}

export interface SyntheticKnowledgeSupersessionContract {
  knowledgeValidityWindow: SyntheticKnowledgeValidityWindow;
  sourceMemorySnapshotIds: string[];
  supersedesKnowledgeIds: string[];
  supersededByKnowledgeIds: string[];
  staleMarker: SyntheticKnowledgeStaleMarker;
  stalenessReasonReferenceIds: string[];
}

export interface SyntheticMethodologyContract {
  methodologyObjectId: string;
  methodologyObjectKey: string;
  methodologyCategory: string;
  methodologyVersion: string;
  methodologyAncestryIds: string[];
  sourceKnowledgeObjectIds: string[];
  sourceKnowledgePackageIds: string[];
  sourceOrganizationalMemoryPackageIds: string[];
  methodologyLineageReferenceIds: string[];
  methodologyEvidenceReferenceIds: string[];
  methodologySourceReferenceIds: string[];
}

export interface SyntheticMethodologyDerivationContract {
  methodologyDerivationMethod: SyntheticMethodologyDerivationMethod;
  methodologyDerivationHash: string;
}

export interface SyntheticMethodologySupersessionContract {
  supersedesMethodologyIds: string[];
  supersededByMethodologyIds: string[];
  methodologyStaleMarker: SyntheticMethodologyStaleMarker;
  methodologyStalenessReasonReferenceIds: string[];
}

export interface SyntheticKnowledgeRelationshipContract {
  knowledgeRelationshipId: string;
  knowledgeRelationshipKey: string;
  relationshipCategory: SyntheticKnowledgeRelationshipCategory;
  relationshipType: SyntheticKnowledgeRelationshipType;
  crossScopeReference: boolean;
  sourceCustomerIsolation: SyntheticMemoryObjectIsolationDimension;
  sourceFirmIsolation: SyntheticMemoryObjectIsolationDimension;
  sourceClientIsolation: SyntheticMemoryObjectIsolationDimension;
  targetCustomerIsolation: SyntheticMemoryObjectIsolationDimension;
  targetFirmIsolation: SyntheticMemoryObjectIsolationDimension;
  targetClientIsolation: SyntheticMemoryObjectIsolationDimension;
}

export interface SyntheticMethodologyRelationshipContract {
  methodologyRelationshipId: string;
  methodologyRelationshipKey: string;
  methodologyRelationshipCategory: SyntheticMethodologyRelationshipCategory;
  methodologyRelationshipType: SyntheticMethodologyRelationshipType;
  crossScopeReference: boolean;
  sourceCustomerIsolation: SyntheticMemoryObjectIsolationDimension;
  sourceFirmIsolation: SyntheticMemoryObjectIsolationDimension;
  sourceClientIsolation: SyntheticMemoryObjectIsolationDimension;
  targetCustomerIsolation: SyntheticMemoryObjectIsolationDimension;
  targetFirmIsolation: SyntheticMemoryObjectIsolationDimension;
  targetClientIsolation: SyntheticMemoryObjectIsolationDimension;
}

export interface SyntheticPhase38HandoffContract {
  knowledgePackageHandle: string;
  methodologyPackageHandle: string;
  knowledgeGraphSnapshotHash: string;
  methodologySnapshotHash: string;
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceFloorMetadata: SyntheticKnowledgeConfidenceFloorMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  customerIsolation: SyntheticMemoryObjectIsolationDimension;
  firmIsolation: SyntheticMemoryObjectIsolationDimension;
  clientIsolation: SyntheticMemoryObjectIsolationDimension;
  sourceKnowledgeObjectIds: string[];
  sourceMethodologyObjectIds: string[];
  sourceMemoryObjectIds: string[];
  sourceEvidenceLineageGraphIds: string[];
  phase38MayConsume: true;
  phase38MayMutate: false;
  phase38MayWriteBack: false;
}

export interface SyntheticPhase37DeterminismContract {
  hashFunction: "stableSnapshotHash";
  hashImportPath: "lib/intelligence/core/hash";
  stableInputCategories: Array<
    | "ids"
    | "categories"
    | "scopes"
    | "isolation_fields"
    | "lineage_references"
    | "evidence_references"
    | "source_references"
    | "package_references"
  >;
  forbiddenInputCategories: Array<"timestamps" | "random_ids" | "mutable_state" | "session_identifiers" | "runtime_only_values" | "model_outputs">;
}

export interface SyntheticPhase37IdempotencyContract {
  identicalInputsProduceIdenticalIds: true;
  identicalInputsProduceIdenticalHashes: true;
  identicalInputsProduceIdenticalOrdering: true;
  identicalInputsProduceIdenticalMetadata: true;
  identicalInputsProduceIdenticalReferences: true;
  implicitSortingAllowed: false;
  implicitDeduplicationAllowed: false;
  runtimeDependentOutputsAllowed: false;
}

export interface SyntheticPhase37ValidEmptyInputContract {
  skipped: true;
  warnings: string[];
  artifactMayExist: true;
  deterministicIdsAllowed: true;
}

export interface SyntheticPhase37InvalidInputContract {
  artifact: null;
  skipped: true;
  warnings: string[];
  failClosed: true;
}

export type SyntheticPhase37BaseArtifactContract = SyntheticPhase37BaseKnowledgeArtifactContract &
  SyntheticPhase37NonExecutabilityContract;

export type SyntheticKnowledgeObjectContract = SyntheticPhase37BaseArtifactContract &
  SyntheticKnowledgeDerivationContract &
  SyntheticKnowledgeSupersessionContract;

export type SyntheticMethodologyObjectContract = SyntheticPhase37BaseArtifactContract &
  SyntheticMethodologyContract &
  SyntheticMethodologyDerivationContract &
  SyntheticMethodologySupersessionContract;
