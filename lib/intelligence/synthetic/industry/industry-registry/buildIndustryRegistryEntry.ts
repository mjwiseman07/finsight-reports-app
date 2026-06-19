import { stableSnapshotHash } from "../../../core/hash";
import type {
  IndustryBaseContract,
  IndustryPerTopicDeclaration,
  IndustryStatus,
  PhiDerivationStatus,
  RecommendationOutputClassification,
} from "../contracts";

export interface BuildIndustryRegistryEntryInput extends Partial<IndustryBaseContract> {
  industryIdentifier?: string;
  industryDisplayName?: string;
  industryStatus?: IndustryStatus;
  isSelectable?: boolean;
  statusTransitionAuditReferenceId?: string;
  declaredSubClassifications?: string[];
  moduleSpecialistReviewDefault?: boolean;
  perTopicDeclarations?: IndustryPerTopicDeclaration[];
  industryRegistryEntryComplete?: boolean;
  contentReadinessMet?: boolean;
  healthcareSpecialistAttestationComplete?: boolean;
}

export interface SyntheticIndustryRegistryEntry extends IndustryBaseContract {
  industryRegistryEntryId: string;
  industryRegistryEntryKey: string;
  industryIdentifier: string;
  industryDisplayName: string;
  industryStatus: IndustryStatus;
  isSelectable: boolean;
  selectableOnlyWhenActive: true;
  failClosedOnNonActiveSelection: true;
  neverSilentlyFallsBackToGeneric: true;
  statusTransitionIsGovernedEvent: true;
  statusTransitionAuditReferenceId: string;
  declaredSubClassifications: string[];
  subClassificationSelectableOnlyWhenDeclared: true;
  moduleSpecialistReviewDefault: boolean;
  subClassificationsInheritModuleDefault: true;
  perTopicDeclarations: IndustryPerTopicDeclaration[];
  industryRegistryEntryComplete: boolean;
}

export interface BuildIndustryRegistryEntryResult {
  industryRegistryEntry: SyntheticIndustryRegistryEntry | null;
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

function isUsGaapFramework(reportingFramework: IndustryBaseContract["reportingFramework"] | undefined): boolean {
  return reportingFramework === "us_gaap";
}

function resolveIndustryStatus(input: BuildIndustryRegistryEntryInput): IndustryStatus | undefined {
  if (input.industryIdentifier === "healthcare") {
    if (!input.reportingFramework) {
      return undefined;
    }

    return isUsGaapFramework(input.reportingFramework) ? "active" : "in_review";
  }

  return input.industryStatus;
}

function computeIsSelectable(input: BuildIndustryRegistryEntryInput, resolvedStatus: IndustryStatus): boolean {
  if (resolvedStatus !== "active") {
    return false;
  }

  if (input.contentReadinessMet !== true) {
    return false;
  }

  if (input.industryIdentifier === "healthcare") {
    return input.healthcareSpecialistAttestationComplete === true;
  }

  return true;
}

function getSharedBase(input: BuildIndustryRegistryEntryInput, resolvedStatus: IndustryStatus): IndustryBaseContract {
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
    industryClassification: input.industryIdentifier ?? "",
    industrySubClassification: getInputArray(input.declaredSubClassifications)[0] ?? "",
    industryStatus: resolvedStatus,
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

function collectMissingRequiredIdentifiers(input: BuildIndustryRegistryEntryInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.industryIdentifier)) {
    missing.push("industryIdentifier");
  }

  if (!hasValue(input.industryDisplayName)) {
    missing.push("industryDisplayName");
  }

  if (!resolveIndustryStatus(input)) {
    missing.push("industryStatus");
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

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
  }

  return missing;
}

function buildIndustryRegistryEntryKey(input: BuildIndustryRegistryEntryInput, resolvedStatus: IndustryStatus): string {
  return stableSnapshotHash({
    industryIdentifier: input.industryIdentifier ?? "",
    industryDisplayName: input.industryDisplayName ?? "",
    industryStatus: resolvedStatus,
    declaredSubClassifications: getInputArray(input.declaredSubClassifications),
    moduleSpecialistReviewDefault: input.moduleSpecialistReviewDefault === true,
    perTopicDeclarations: getInputArray(input.perTopicDeclarations).map((declaration) => ({
      topicIdentifier: declaration.topicIdentifier,
      requiresSpecialistReview: declaration.requiresSpecialistReview,
    })),
    statusTransitionAuditReferenceId: input.statusTransitionAuditReferenceId ?? "",
    reportingFramework: input.reportingFramework ?? "",
  });
}

function buildIndustryRegistryEntryId(input: BuildIndustryRegistryEntryInput, resolvedStatus: IndustryStatus): string {
  return `synthetic-industry-registry-entry:${stableSnapshotHash({
    industryRegistryEntryKey: buildIndustryRegistryEntryKey(input, resolvedStatus),
    artifactType: "SyntheticIndustryRegistryEntry",
  })}`;
}

function buildDerivationHash(input: BuildIndustryRegistryEntryInput, resolvedStatus: IndustryStatus, isSelectable: boolean): string {
  return stableSnapshotHash({
    industryRegistryEntryKey: buildIndustryRegistryEntryKey(input, resolvedStatus),
    industryIdentifier: input.industryIdentifier ?? "",
    industryStatus: resolvedStatus,
    isSelectable,
    selectableOnlyWhenActive: true,
    failClosedOnNonActiveSelection: true,
    neverSilentlyFallsBackToGeneric: true,
    statusTransitionIsGovernedEvent: true,
    subClassificationSelectableOnlyWhenDeclared: true,
    subClassificationsInheritModuleDefault: true,
  });
}

function getWarnings(
  input: BuildIndustryRegistryEntryInput,
  resolvedStatus: IndustryStatus,
  isSelectable: boolean,
): string[] {
  return [
    ...getInputArray(input.warnings),
    ...(resolvedStatus !== "active" && isSelectable
      ? ["non-active industry cannot be selectable; selection fails closed as not yet supported"]
      : []),
    ...(input.industryIdentifier === "healthcare" &&
    resolvedStatus === "active" &&
    input.healthcareSpecialistAttestationComplete !== true
      ? [
          "healthcare requires specialist attestation on all requiresSpecialistReview topics before becoming selectable",
        ]
      : []),
    ...(input.industryIdentifier === "healthcare" &&
    !isUsGaapFramework(input.reportingFramework) &&
    resolvedStatus === "in_review"
      ? ["healthcare is in_review for non-us_gaap reporting frameworks; selection fails closed"]
      : []),
    ...(resolvedStatus === "active" && input.contentReadinessMet !== true
      ? ["industry content readiness not met; isSelectable reflects actual readiness not intended post-lock status"]
      : []),
  ];
}

export function buildIndustryRegistryEntry(
  input: BuildIndustryRegistryEntryInput,
): BuildIndustryRegistryEntryResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryRegistryEntry: null,
      skipped: true,
      warnings: [`missing required industry registry entry identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const resolvedStatus = resolveIndustryStatus(input) as IndustryStatus;
  const isSelectable = input.isSelectable ?? computeIsSelectable(input, resolvedStatus);
  const requiredIndustryIdentifier = input.industryIdentifier as string;
  const requiredIndustryDisplayName = input.industryDisplayName as string;
  const base = getSharedBase(input, resolvedStatus);
  const industryRegistryEntry: SyntheticIndustryRegistryEntry = {
    ...base,
    industryRegistryEntryId: buildIndustryRegistryEntryId(input, resolvedStatus),
    industryRegistryEntryKey: buildIndustryRegistryEntryKey(input, resolvedStatus),
    industryIdentifier: requiredIndustryIdentifier,
    industryDisplayName: requiredIndustryDisplayName,
    industryStatus: resolvedStatus,
    isSelectable,
    selectableOnlyWhenActive: true,
    failClosedOnNonActiveSelection: true,
    neverSilentlyFallsBackToGeneric: true,
    statusTransitionIsGovernedEvent: true,
    statusTransitionAuditReferenceId: input.statusTransitionAuditReferenceId ?? "",
    declaredSubClassifications: getInputArray(input.declaredSubClassifications),
    subClassificationSelectableOnlyWhenDeclared: true,
    moduleSpecialistReviewDefault: input.moduleSpecialistReviewDefault === true,
    subClassificationsInheritModuleDefault: true,
    perTopicDeclarations: getInputArray(input.perTopicDeclarations),
    executable: false,
    derivationHash: buildDerivationHash(input, resolvedStatus, isSelectable),
    warnings: getWarnings(input, resolvedStatus, isSelectable),
    industryRegistryEntryComplete: input.industryRegistryEntryComplete === true,
  };

  return {
    industryRegistryEntry,
    skipped: false,
    warnings: industryRegistryEntry.warnings,
  };
}
