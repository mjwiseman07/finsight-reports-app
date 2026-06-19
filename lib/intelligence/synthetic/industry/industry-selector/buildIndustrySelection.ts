import { stableSnapshotHash } from "../../../core/hash";
import type {
  IndustryBaseContract,
  PhiDerivationStatus,
  RecommendationOutputClassification,
} from "../contracts";

export type IndustrySelectionStatus = "pending" | "locked";

export interface BuildIndustrySelectionInput extends Partial<IndustryBaseContract> {
  entityId?: string;
  selectedIndustry?: string;
  selectedSubClassification?: string;
  industryRegistryReferenceId?: string;
  activeIndustryIdentifiers?: string[];
  declaredSubClassifications?: string[];
  industryIsActive?: boolean;
  subClassificationIsDeclared?: boolean;
  effectiveFromDate?: string;
  industryChangeAuditReferenceId?: string;
  selectionStatus?: IndustrySelectionStatus;
  industrySelectionComplete?: boolean;
}

export interface SyntheticIndustrySelection extends IndustryBaseContract {
  industrySelectionId: string;
  industrySelectionKey: string;
  entityId: string;
  selectedIndustry: string;
  selectedSubClassification: string;
  onlyActiveIndustriesSelectable: true;
  onlyDeclaredSubClassificationsSelectable: true;
  selectionFailsClosedIfNotActive: true;
  selectionFailsClosedIfSubClassificationNotDeclared: true;
  industryRegistryReferenceId: string;
  industrySetPerEntityNotPerCustomer: true;
  multiSubClassificationAcrossEntitiesSupported: true;
  effectiveFromDate: string;
  changeIsGovernedEventNotToggle: true;
  changeRequiresAttestation: true;
  changeProducesAuditableLineageRecord: true;
  historicalResolutionByEffectiveClassification: true;
  priorClassificationMemoryDoesNotCarryForward: true;
  industryChangeAuditReferenceId: string;
  selectionStatus: IndustrySelectionStatus;
  industrySelectionComplete: boolean;
}

export interface BuildIndustrySelectionResult {
  industrySelection: SyntheticIndustrySelection | null;
  skipped: boolean;
  warnings: string[];
}

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";

const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getPhiDerivationStatus(inputPhiDerivationStatus: PhiDerivationStatus | undefined): PhiDerivationStatus {
  return inputPhiDerivationStatus ?? DEFAULT_PHI_DERIVATION_STATUS;
}

function isIndustryActive(input: BuildIndustrySelectionInput): boolean {
  if (input.industryIsActive !== undefined) {
    return input.industryIsActive === true;
  }

  const activeIndustryIdentifiers = getInputArray(input.activeIndustryIdentifiers);
  if (activeIndustryIdentifiers.length === 0 || !hasValue(input.selectedIndustry)) {
    return false;
  }

  return activeIndustryIdentifiers.includes(input.selectedIndustry as string);
}

function isSubClassificationDeclared(input: BuildIndustrySelectionInput): boolean {
  if (input.subClassificationIsDeclared !== undefined) {
    return input.subClassificationIsDeclared === true;
  }

  const declaredSubClassifications = getInputArray(input.declaredSubClassifications);
  if (declaredSubClassifications.length === 0 || !hasValue(input.selectedSubClassification)) {
    return false;
  }

  return declaredSubClassifications.includes(input.selectedSubClassification as string);
}

function hasInvalidSelection(input: BuildIndustrySelectionInput): boolean {
  return !isIndustryActive(input) || !isSubClassificationDeclared(input);
}

function getSelectionStatus(input: BuildIndustrySelectionInput): IndustrySelectionStatus {
  if (hasInvalidSelection(input)) {
    return "pending";
  }

  return input.selectionStatus === "locked" ? "locked" : "pending";
}

function getSharedBase(input: BuildIndustrySelectionInput): IndustryBaseContract {
  return {
    phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
    phase40_5IntegrationHandoffHandle: input.phase40_5IntegrationHandoffHandle ?? "",
    phase41_5StandardsHandoffHandle: input.phase41_5StandardsHandoffHandle ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase40_5SnapshotHash: input.boundPhase40_5SnapshotHash ?? "",
    boundPhase41_5SnapshotHash: input.boundPhase41_5SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    phase42StaleMarker: input.phase42StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    reportingFramework: input.reportingFramework ?? "us_gaap",
    industryClassification: input.selectedIndustry ?? "",
    industrySubClassification: input.selectedSubClassification ?? "",
    industryStatus: input.industryStatus ?? "recognized_unpopulated",
    containsPHI: getContainsPHI(input.containsPHI),
    phiDerivationStatus: getPhiDerivationStatus(input.phiDerivationStatus),
    output_classification: OUTPUT_CLASSIFICATION,
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata),
    warnings: getInputArray(input.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes),
  } as IndustryBaseContract;
}

function collectMissingRequiredIdentifiers(input: BuildIndustrySelectionInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.entityId)) {
    missing.push("entityId");
  }

  if (!hasValue(input.selectedIndustry)) {
    missing.push("selectedIndustry");
  }

  if (!hasValue(input.selectedSubClassification)) {
    missing.push("selectedSubClassification");
  }

  if (!hasValue(input.effectiveFromDate)) {
    missing.push("effectiveFromDate");
  }

  if (!hasValue(input.industryRegistryReferenceId)) {
    missing.push("industryRegistryReferenceId");
  }

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
  }

  if (!hasValue(input.boundPhase40_5SnapshotHash)) {
    missing.push("boundPhase40_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase41_5SnapshotHash)) {
    missing.push("boundPhase41_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!input.scope) {
    missing.push("scope");
  }

  if (!input.customerIsolation) {
    missing.push("customerIsolation");
  }

  if (!input.firmIsolation) {
    missing.push("firmIsolation");
  }

  if (!input.clientIsolation) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildIndustrySelectionKey(input: BuildIndustrySelectionInput): string {
  return stableSnapshotHash({
    entityId: input.entityId ?? "",
    selectedIndustry: input.selectedIndustry ?? "",
    selectedSubClassification: input.selectedSubClassification ?? "",
    industryRegistryReferenceId: input.industryRegistryReferenceId ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    industryChangeAuditReferenceId: input.industryChangeAuditReferenceId ?? "",
    selectionStatus: getSelectionStatus(input),
  });
}

function buildIndustrySelectionId(input: BuildIndustrySelectionInput): string {
  return `synthetic-industry-selection:${stableSnapshotHash({
    industrySelectionKey: buildIndustrySelectionKey(input),
    artifactType: "SyntheticIndustrySelection",
  })}`;
}

function buildDerivationHash(input: BuildIndustrySelectionInput): string {
  return stableSnapshotHash({
    industrySelectionKey: buildIndustrySelectionKey(input),
    onlyActiveIndustriesSelectable: true,
    onlyDeclaredSubClassificationsSelectable: true,
    selectionFailsClosedIfNotActive: true,
    selectionFailsClosedIfSubClassificationNotDeclared: true,
    industrySetPerEntityNotPerCustomer: true,
    multiSubClassificationAcrossEntitiesSupported: true,
    changeIsGovernedEventNotToggle: true,
    changeRequiresAttestation: true,
    changeProducesAuditableLineageRecord: true,
    historicalResolutionByEffectiveClassification: true,
    priorClassificationMemoryDoesNotCarryForward: true,
    selectionStatus: getSelectionStatus(input),
  });
}

function getWarnings(input: BuildIndustrySelectionInput, selectionStatus: IndustrySelectionStatus): string[] {
  const industryActive = isIndustryActive(input);
  const subClassificationDeclared = isSubClassificationDeclared(input);

  return [
    ...getInputArray(input.warnings),
    ...(!industryActive
      ? [`selection fails closed for non-active industry: ${input.selectedIndustry ?? ""}`]
      : []),
    ...(!subClassificationDeclared
      ? [
          `selection fails closed for undeclared sub-classification: ${input.selectedSubClassification ?? ""}`,
        ]
      : []),
    ...(selectionStatus === "pending" && input.selectionStatus === "locked"
      ? ["selection lock rejected because industry is not active or sub-classification is not declared"]
      : []),
    ...(selectionStatus === "locked"
      ? [
          "industry and sub-classification changes are governed events requiring attestation; prior classification memory does not carry forward",
        ]
      : []),
    "metadata-only industry selection contract; live onboarding selection and governed change against real entities is deferred to real-data validation",
  ];
}

export function buildIndustrySelection(input: BuildIndustrySelectionInput): BuildIndustrySelectionResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industrySelection: null,
      skipped: true,
      warnings: [`missing required industry selection identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const requiredEntityId = input.entityId as string;
  const requiredSelectedIndustry = input.selectedIndustry as string;
  const requiredSelectedSubClassification = input.selectedSubClassification as string;
  const requiredEffectiveFromDate = input.effectiveFromDate as string;
  const requiredIndustryRegistryReferenceId = input.industryRegistryReferenceId as string;
  const selectionStatus = getSelectionStatus(input);
  const base = getSharedBase(input);
  const industrySelection: SyntheticIndustrySelection = {
    ...base,
    industrySelectionId: buildIndustrySelectionId(input),
    industrySelectionKey: buildIndustrySelectionKey(input),
    entityId: requiredEntityId,
    selectedIndustry: requiredSelectedIndustry,
    selectedSubClassification: requiredSelectedSubClassification,
    onlyActiveIndustriesSelectable: true,
    onlyDeclaredSubClassificationsSelectable: true,
    selectionFailsClosedIfNotActive: true,
    selectionFailsClosedIfSubClassificationNotDeclared: true,
    industryRegistryReferenceId: requiredIndustryRegistryReferenceId,
    industrySetPerEntityNotPerCustomer: true,
    multiSubClassificationAcrossEntitiesSupported: true,
    effectiveFromDate: requiredEffectiveFromDate,
    changeIsGovernedEventNotToggle: true,
    changeRequiresAttestation: true,
    changeProducesAuditableLineageRecord: true,
    historicalResolutionByEffectiveClassification: true,
    priorClassificationMemoryDoesNotCarryForward: true,
    industryChangeAuditReferenceId: input.industryChangeAuditReferenceId ?? "",
    selectionStatus,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, selectionStatus),
    industrySelectionComplete:
      input.industrySelectionComplete === true && selectionStatus === "locked" && !hasInvalidSelection(input),
  };

  return {
    industrySelection,
    skipped: false,
    warnings: industrySelection.warnings,
  };
}
