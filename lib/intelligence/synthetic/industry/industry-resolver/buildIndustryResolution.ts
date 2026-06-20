import { stableSnapshotHash } from "../../../core/hash";
import type {
  IndustryBaseContract,
  IndustryResolutionFailClosedReason,
  IndustryResolutionStatus,
  PhiDerivationStatus,
  RecommendationOutputClassification,
} from "../contracts";
import {
  isGenericTreatment11HealthcareGuardTopic,
  type GenericTreatmentApplicabilityGuard,
} from "../libraries/generic/genericTreatment11Metadata";

export interface BuildIndustryResolutionInput extends Partial<IndustryBaseContract> {
  queryTopicIdentifier?: string;
  queryIndustry?: string;
  querySubClassification?: string;
  queryFramework?: IndustryBaseContract["reportingFramework"];
  queryEffectiveDate?: string;
  entityId?: string;
  industryRegistryReferenceId?: string;
  resolvedTreatmentReferenceId?: string;
  resolvedTreatmentVersion?: string;
  resolvedTreatmentEffectiveFromDate?: string;
  resolvedCitationReference?: string;
  resolvedReviewerAttestationReference?: string;
  resolvedSpecialistReviewerReference?: string;
  resolvedTreatmentApplicabilityGuard?: GenericTreatmentApplicabilityGuard | null;
  nonPatientPoolExceptionAttestationPresent?: boolean;
  resolutionStatus?: IndustryResolutionStatus;
  failClosedReason?: IndustryResolutionFailClosedReason;
  industryIsActive?: boolean;
  subClassificationIsDeclared?: boolean;
  frameworkIsActive?: boolean;
  tupleIsPopulated?: boolean;
  specialistReviewRequired?: boolean;
  moduleSpecialistReviewDefault?: boolean;
  specialistReviewOptOutAttested?: boolean;
  specialistAttestationPresent?: boolean;
  industryResolutionComplete?: boolean;
}

export interface SyntheticIndustryResolution extends IndustryBaseContract {
  industryResolutionId: string;
  industryResolutionKey: string;
  queryTopicIdentifier: string;
  queryIndustry: string;
  querySubClassification: string;
  queryFramework: IndustryBaseContract["reportingFramework"];
  queryEffectiveDate: string;
  entityId: string;
  resolverIsSingleInterfaceForRoles: true;
  rolesNeverCallIndustryContentDirectly: true;
  resolvedTreatmentReferenceId: string;
  resolvedTreatmentVersion: string;
  resolvedTreatmentEffectiveFromDate: string;
  resolvedCitationReference: string;
  resolvedReviewerAttestationReference: string;
  resolvedSpecialistReviewerReference: string;
  resolutionStatus: IndustryResolutionStatus;
  failClosedReason: IndustryResolutionFailClosedReason;
  failsClosedOnNonActiveIndustry: true;
  failsClosedOnUndeclaredSubClassification: true;
  failsClosedOnNonActiveFramework: true;
  failsClosedOnUnpopulatedTuple: true;
  failsClosedOnSpecialistAttestationMissing: true;
  failsClosedOnTreatmentApplicabilityGuardBlocked: true;
  neverSilentlyFallsBackToGeneric: true;
  historicalResolutionByEffectiveDate: true;
  industryRegistryReferenceId: string;
  industryResolutionComplete: boolean;
}

export interface BuildIndustryResolutionResult {
  industryResolution: SyntheticIndustryResolution | null;
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

function requiresSpecialistAttestation(input: BuildIndustryResolutionInput): boolean {
  if (input.specialistReviewRequired === true) {
    return true;
  }

  if (input.moduleSpecialistReviewDefault === true && input.specialistReviewOptOutAttested !== true) {
    return true;
  }

  return false;
}

function isHealthcareProviderEntity(queryIndustry: string): boolean {
  return queryIndustry === "healthcare" || queryIndustry === "healthcare_provider";
}

function isWellFormedTreatment11ApplicabilityGuard(
  guard: GenericTreatmentApplicabilityGuard | null | undefined,
): guard is GenericTreatmentApplicabilityGuard {
  if (!guard) {
    return false;
  }

  return (
    Array.isArray(guard.blockedIndustries) &&
    guard.blockedIndustries.includes("healthcare_provider") &&
    guard.overrideAllowed === false &&
    guard.bypassRequiresEngineering === true &&
    guard.nonPatientPoolException.allowed === true &&
    guard.nonPatientPoolException.poolLevelOnly === true &&
    guard.nonPatientPoolException.requiresAttestation != null
  );
}

function getTreatment11ApplicabilityGuardFailReason(
  input: BuildIndustryResolutionInput,
): IndustryResolutionFailClosedReason | "none" {
  const queryTopicIdentifier = input.queryTopicIdentifier ?? "";
  if (!isGenericTreatment11HealthcareGuardTopic(queryTopicIdentifier)) {
    return "none";
  }

  if (!isWellFormedTreatment11ApplicabilityGuard(input.resolvedTreatmentApplicabilityGuard)) {
    return "tuple_unpopulated";
  }

  if (!isHealthcareProviderEntity(input.queryIndustry ?? "")) {
    return "none";
  }

  if (
    input.resolvedTreatmentApplicabilityGuard.nonPatientPoolException.allowed === true &&
    input.resolvedTreatmentApplicabilityGuard.nonPatientPoolException.poolLevelOnly === true &&
    input.nonPatientPoolExceptionAttestationPresent === true
  ) {
    return "none";
  }

  return "specialist_attestation_missing";
}

function getFailClosedReason(input: BuildIndustryResolutionInput): IndustryResolutionFailClosedReason {
  if (input.industryIsActive !== true) {
    return "industry_not_active";
  }

  if (input.subClassificationIsDeclared !== true) {
    return "subclassification_not_declared";
  }

  if (input.frameworkIsActive !== true) {
    return "framework_not_active";
  }

  if (input.tupleIsPopulated !== true) {
    return "tuple_unpopulated";
  }

  const treatment11GuardFailReason = getTreatment11ApplicabilityGuardFailReason(input);
  if (treatment11GuardFailReason !== "none") {
    return treatment11GuardFailReason;
  }

  if (requiresSpecialistAttestation(input) && input.specialistAttestationPresent !== true) {
    return "specialist_attestation_missing";
  }

  return input.failClosedReason ?? "none";
}

function getResolutionStatus(input: BuildIndustryResolutionInput): IndustryResolutionStatus {
  return getFailClosedReason(input) === "none" ? input.resolutionStatus ?? "resolved" : "fail_closed";
}

function getSharedBase(input: BuildIndustryResolutionInput): IndustryBaseContract {
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
    reportingFramework: input.reportingFramework ?? input.queryFramework ?? "us_gaap",
    industryClassification: input.queryIndustry ?? "",
    industrySubClassification: input.querySubClassification ?? "",
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

function collectMissingRequiredIdentifiers(input: BuildIndustryResolutionInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.queryTopicIdentifier)) {
    missing.push("queryTopicIdentifier");
  }

  if (!hasValue(input.queryIndustry)) {
    missing.push("queryIndustry");
  }

  if (!hasValue(input.querySubClassification)) {
    missing.push("querySubClassification");
  }

  if (!input.queryFramework) {
    missing.push("queryFramework");
  }

  if (!hasValue(input.queryEffectiveDate)) {
    missing.push("queryEffectiveDate");
  }

  if (!hasValue(input.entityId)) {
    missing.push("entityId");
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

function buildIndustryResolutionKey(input: BuildIndustryResolutionInput): string {
  return stableSnapshotHash({
    queryTopicIdentifier: input.queryTopicIdentifier ?? "",
    queryIndustry: input.queryIndustry ?? "",
    querySubClassification: input.querySubClassification ?? "",
    queryFramework: input.queryFramework ?? "",
    queryEffectiveDate: input.queryEffectiveDate ?? "",
    entityId: input.entityId ?? "",
    industryRegistryReferenceId: input.industryRegistryReferenceId ?? "",
    resolvedTreatmentReferenceId: input.resolvedTreatmentReferenceId ?? "",
    resolvedTreatmentVersion: input.resolvedTreatmentVersion ?? "",
    resolvedTreatmentEffectiveFromDate: input.resolvedTreatmentEffectiveFromDate ?? "",
    resolvedCitationReference: input.resolvedCitationReference ?? "",
    resolvedReviewerAttestationReference: input.resolvedReviewerAttestationReference ?? "",
    resolvedSpecialistReviewerReference: input.resolvedSpecialistReviewerReference ?? "",
    failClosedReason: getFailClosedReason(input),
  });
}

function buildIndustryResolutionId(input: BuildIndustryResolutionInput): string {
  return `synthetic-industry-resolution:${stableSnapshotHash({
    industryResolutionKey: buildIndustryResolutionKey(input),
    artifactType: "SyntheticIndustryResolution",
  })}`;
}

function buildDerivationHash(input: BuildIndustryResolutionInput): string {
  return stableSnapshotHash({
    industryResolutionKey: buildIndustryResolutionKey(input),
    resolverIsSingleInterfaceForRoles: true,
    rolesNeverCallIndustryContentDirectly: true,
    resolutionStatus: getResolutionStatus(input),
    failClosedReason: getFailClosedReason(input),
    failsClosedOnNonActiveIndustry: true,
    failsClosedOnUndeclaredSubClassification: true,
    failsClosedOnNonActiveFramework: true,
    failsClosedOnUnpopulatedTuple: true,
    failsClosedOnSpecialistAttestationMissing: true,
    failsClosedOnTreatmentApplicabilityGuardBlocked: true,
    neverSilentlyFallsBackToGeneric: true,
    historicalResolutionByEffectiveDate: true,
  });
}

function getWarnings(
  input: BuildIndustryResolutionInput,
  resolutionStatus: IndustryResolutionStatus,
  failClosedReason: IndustryResolutionFailClosedReason,
): string[] {
  const queryTopicIdentifier = input.queryTopicIdentifier ?? "";

  return [
    ...getInputArray(input.warnings),
    ...(resolutionStatus === "fail_closed" ? [`industry resolution failed closed: ${failClosedReason}`] : []),
    ...(failClosedReason === "specialist_attestation_missing" &&
    isGenericTreatment11HealthcareGuardTopic(queryTopicIdentifier) &&
    isHealthcareProviderEntity(input.queryIndustry ?? "")
      ? [
          "generic Treatment-11 applicabilityGuard blocks healthcare_provider bind unless pool-level non-patient exception specialist attestation is present",
        ]
      : []),
    ...(failClosedReason === "tuple_unpopulated" &&
    isGenericTreatment11HealthcareGuardTopic(queryTopicIdentifier) &&
    !isWellFormedTreatment11ApplicabilityGuard(input.resolvedTreatmentApplicabilityGuard)
      ? ["generic Treatment-11 bind refused because applicabilityGuard metadata is missing or malformed"]
      : []),
    ...(failClosedReason === "specialist_attestation_missing"
      ? ["specialist-required topic cannot be served without specialist attestation reference"]
      : []),
    ...(failClosedReason === "industry_not_active"
      ? ["non-active industry selection never silently falls back to generic or any substitute industry"]
      : []),
    "metadata-only resolver contract; live lookup against authored content, registry state, and entity configuration is deferred to real-data validation",
  ];
}

export function buildIndustryResolution(input: BuildIndustryResolutionInput): BuildIndustryResolutionResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryResolution: null,
      skipped: true,
      warnings: [`missing required industry resolution identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const requiredQueryTopicIdentifier = input.queryTopicIdentifier as string;
  const requiredQueryIndustry = input.queryIndustry as string;
  const requiredQuerySubClassification = input.querySubClassification as string;
  const requiredQueryFramework = input.queryFramework as IndustryBaseContract["reportingFramework"];
  const requiredQueryEffectiveDate = input.queryEffectiveDate as string;
  const requiredEntityId = input.entityId as string;
  const requiredIndustryRegistryReferenceId = input.industryRegistryReferenceId as string;
  const failClosedReason = getFailClosedReason(input);
  const resolutionStatus = getResolutionStatus(input);
  const base = getSharedBase(input);
  const industryResolution: SyntheticIndustryResolution = {
    ...base,
    industryResolutionId: buildIndustryResolutionId(input),
    industryResolutionKey: buildIndustryResolutionKey(input),
    queryTopicIdentifier: requiredQueryTopicIdentifier,
    queryIndustry: requiredQueryIndustry,
    querySubClassification: requiredQuerySubClassification,
    queryFramework: requiredQueryFramework,
    queryEffectiveDate: requiredQueryEffectiveDate,
    entityId: requiredEntityId,
    resolverIsSingleInterfaceForRoles: true,
    rolesNeverCallIndustryContentDirectly: true,
    resolvedTreatmentReferenceId: resolutionStatus === "resolved" ? input.resolvedTreatmentReferenceId ?? "" : "",
    resolvedTreatmentVersion: resolutionStatus === "resolved" ? input.resolvedTreatmentVersion ?? "" : "",
    resolvedTreatmentEffectiveFromDate:
      resolutionStatus === "resolved" ? input.resolvedTreatmentEffectiveFromDate ?? "" : "",
    resolvedCitationReference: resolutionStatus === "resolved" ? input.resolvedCitationReference ?? "" : "",
    resolvedReviewerAttestationReference:
      resolutionStatus === "resolved" ? input.resolvedReviewerAttestationReference ?? "" : "",
    resolvedSpecialistReviewerReference:
      resolutionStatus === "resolved" ? input.resolvedSpecialistReviewerReference ?? "" : "",
    resolutionStatus,
    failClosedReason,
    failsClosedOnNonActiveIndustry: true,
    failsClosedOnUndeclaredSubClassification: true,
    failsClosedOnNonActiveFramework: true,
    failsClosedOnUnpopulatedTuple: true,
    failsClosedOnSpecialistAttestationMissing: true,
    failsClosedOnTreatmentApplicabilityGuardBlocked: true,
    neverSilentlyFallsBackToGeneric: true,
    historicalResolutionByEffectiveDate: true,
    industryRegistryReferenceId: requiredIndustryRegistryReferenceId,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, resolutionStatus, failClosedReason),
    industryResolutionComplete: input.industryResolutionComplete === true && resolutionStatus === "resolved",
  };

  return {
    industryResolution,
    skipped: false,
    warnings: industryResolution.warnings,
  };
}
