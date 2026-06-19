import { stableSnapshotHash } from "../../../core/hash";
import type {
  DisplacementLineageEntry,
  IndustryBaseContract,
  IndustryCompositionOutcome,
  PhiDerivationStatus,
  RecommendationOutputClassification,
} from "../contracts";

export interface BuildComposedTreatmentInput extends Partial<IndustryBaseContract> {
  queryTopicIdentifier?: string;
  queryIndustry?: string;
  querySubClassification?: string;
  queryFramework?: IndustryBaseContract["reportingFramework"];
  queryEffectiveDate?: string;
  compositionOutcome?: IndustryCompositionOutcome;
  frameworkSourceReferenceId?: string;
  frameworkSourceVersion?: string;
  industrySourceReferenceId?: string;
  industrySourceVersion?: string;
  frameworkPhiDerivationStatus?: PhiDerivationStatus;
  industryPhiDerivationStatus?: PhiDerivationStatus;
  topicInDifferencesCatalog?: boolean;
  differencesCatalogConsultationReferenceId?: string;
  resolvedTreatmentReferenceId?: string;
  specializationNotes?: string;
  displacementLineage?: DisplacementLineageEntry[];
  displacementJustification?: string;
  conflictReportReferenceId?: string;
  frameworkChangeGovernanceReferenceId?: string;
  composedTreatmentComplete?: boolean;
}

export interface SyntheticComposedTreatmentBase extends IndustryBaseContract {
  composedTreatmentId: string;
  composedTreatmentKey: string;
  queryTopicIdentifier: string;
  queryIndustry: string;
  querySubClassification: string;
  queryFramework: IndustryBaseContract["reportingFramework"];
  queryEffectiveDate: string;
  frameworkSourceReferenceId: string;
  frameworkSourceVersion: string;
  industrySourceReferenceId: string;
  industrySourceVersion: string;
  differencesCatalogConsultationReferenceId?: string;
  compositionIsDeterministic: true;
  reconstructionGradeLineage: true;
  frameworkIsBaseIndustryIsOverlay: true;
  industryMayNotViolateFramework: true;
  phiDerivationStatusPropagatesMostRestrictive: true;
  composedPhiDerivationStatus: PhiDerivationStatus;
  composedTreatmentComplete: boolean;
}

export interface SyntheticComposedTreatmentSpecializes extends SyntheticComposedTreatmentBase {
  compositionOutcome: "specializes";
  resolvedTreatmentReferenceId: string;
  specializationNotes: string;
}

export interface SyntheticComposedTreatmentSpecializesWithDisplacement extends SyntheticComposedTreatmentBase {
  compositionOutcome: "specializesWithDisplacement";
  resolvedTreatmentReferenceId: string;
  displacementLineage: [DisplacementLineageEntry, ...DisplacementLineageEntry[]];
  displacementJustification: string;
  specialistReviewerRequiredForDisplacement: true;
  displacementLineageIsReconstructionGrade: true;
  failsClosedIfDisplacementLineageIncomplete: true;
}

export interface SyntheticComposedTreatmentContradiction extends SyntheticComposedTreatmentBase {
  compositionOutcome: "contradiction";
  conflictReportReferenceId: string;
  contradictionEmitsConflictReportNeverResolves: true;
  requiresFrameworkChangeGovernanceToReconcile: true;
  frameworkChangeGovernanceReferenceId: string;
}

export type SyntheticComposedTreatment =
  | SyntheticComposedTreatmentSpecializes
  | SyntheticComposedTreatmentSpecializesWithDisplacement
  | SyntheticComposedTreatmentContradiction;

export interface BuildComposedTreatmentResult {
  composedTreatment: SyntheticComposedTreatment | null;
  skipped: boolean;
  warnings: string[];
}

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";

const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";

const PHI_RESTRICTIVENESS_ORDER: readonly PhiDerivationStatus[] = [
  "containsPHI",
  "derivedFromPHIThroughExpertDetermination",
  "derivedFromPHIThroughSafeHarbor",
  "containsNoPHI",
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getMostRestrictivePhiDerivationStatus(
  ...statuses: (PhiDerivationStatus | undefined)[]
): PhiDerivationStatus {
  const presentStatuses = statuses.filter((status): status is PhiDerivationStatus => hasValue(status));

  if (presentStatuses.length === 0) {
    return DEFAULT_PHI_DERIVATION_STATUS;
  }

  for (const status of PHI_RESTRICTIVENESS_ORDER) {
    if (presentStatuses.includes(status)) {
      return status;
    }
  }

  return DEFAULT_PHI_DERIVATION_STATUS;
}

function getContainsPHIFromComposedStatus(composedPhiDerivationStatus: PhiDerivationStatus): boolean {
  return composedPhiDerivationStatus !== "containsNoPHI";
}

function getDifferencesCatalogConsultationReferenceId(
  input: BuildComposedTreatmentInput,
): string | undefined {
  if (input.topicInDifferencesCatalog !== true) {
    return undefined;
  }

  return input.differencesCatalogConsultationReferenceId ?? "";
}

function isDisplacementLineageEntryComplete(entry: DisplacementLineageEntry): boolean {
  return (
    hasValue(entry.displacedFrameworkElementId) &&
    hasValue(entry.displacedElementVersion) &&
    hasValue(entry.displacedElementEffectiveDate) &&
    hasValue(entry.displacingIndustryElementId) &&
    hasValue(entry.displacingElementVersion) &&
    hasValue(entry.authoritativeCitationRef) &&
    hasValue(entry.specialistAttestationRef)
  );
}

function getValidatedDisplacementLineage(
  displacementLineage: DisplacementLineageEntry[] | undefined,
): [DisplacementLineageEntry, ...DisplacementLineageEntry[]] | null {
  if (!displacementLineage || displacementLineage.length === 0) {
    return null;
  }

  if (!displacementLineage.every(isDisplacementLineageEntryComplete)) {
    return null;
  }

  return displacementLineage as [DisplacementLineageEntry, ...DisplacementLineageEntry[]];
}

function collectDisplacementFailures(input: BuildComposedTreatmentInput): string[] {
  const failures: string[] = [];
  const displacementLineage = getInputArray(input.displacementLineage);

  if (displacementLineage.length === 0) {
    failures.push("displacementLineage must be non-empty for specializesWithDisplacement");
  }

  displacementLineage.forEach((entry, index) => {
    if (!hasValue(entry.displacedElementVersion)) {
      failures.push(`displacementLineage[${index}] missing displacedElementVersion`);
    }

    if (!hasValue(entry.displacedElementEffectiveDate)) {
      failures.push(`displacementLineage[${index}] missing displacedElementEffectiveDate`);
    }

    if (!hasValue(entry.specialistAttestationRef)) {
      failures.push(`displacementLineage[${index}] missing specialistAttestationRef`);
    }
  });

  if (!hasValue(input.displacementJustification)) {
    failures.push("displacementJustification is required for specializesWithDisplacement");
  }

  return failures;
}

function collectVariantFailures(input: BuildComposedTreatmentInput): string[] {
  if (!input.compositionOutcome) {
    return ["compositionOutcome is required"];
  }

  if (input.compositionOutcome === "specializesWithDisplacement") {
    const failures = collectDisplacementFailures(input);

    if (!hasValue(input.resolvedTreatmentReferenceId)) {
      failures.push("resolvedTreatmentReferenceId is required for specializesWithDisplacement");
    }

    return failures;
  }

  if (input.compositionOutcome === "contradiction") {
    const failures: string[] = [];

    if (!hasValue(input.conflictReportReferenceId)) {
      failures.push("conflictReportReferenceId is required for contradiction");
    }

    if (!hasValue(input.frameworkChangeGovernanceReferenceId)) {
      failures.push("frameworkChangeGovernanceReferenceId is required for contradiction");
    }

    return failures;
  }

  if (!hasValue(input.resolvedTreatmentReferenceId)) {
    return ["resolvedTreatmentReferenceId is required for specializes"];
  }

  return [];
}

function getSharedBase(
  input: BuildComposedTreatmentInput,
  composedPhiDerivationStatus: PhiDerivationStatus,
): IndustryBaseContract {
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
    containsPHI: getContainsPHIFromComposedStatus(composedPhiDerivationStatus),
    phiDerivationStatus: composedPhiDerivationStatus,
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

function collectMissingRequiredIdentifiers(input: BuildComposedTreatmentInput): string[] {
  const missing: string[] = [];

  if (!input.compositionOutcome) {
    missing.push("compositionOutcome");
  }

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

  if (!hasValue(input.frameworkSourceReferenceId)) {
    missing.push("frameworkSourceReferenceId");
  }

  if (!hasValue(input.frameworkSourceVersion)) {
    missing.push("frameworkSourceVersion");
  }

  if (!hasValue(input.industrySourceReferenceId)) {
    missing.push("industrySourceReferenceId");
  }

  if (!hasValue(input.industrySourceVersion)) {
    missing.push("industrySourceVersion");
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

function buildComposedTreatmentKey(input: BuildComposedTreatmentInput): string {
  return stableSnapshotHash({
    queryTopicIdentifier: input.queryTopicIdentifier ?? "",
    queryIndustry: input.queryIndustry ?? "",
    querySubClassification: input.querySubClassification ?? "",
    queryFramework: input.queryFramework ?? "",
    queryEffectiveDate: input.queryEffectiveDate ?? "",
    compositionOutcome: input.compositionOutcome ?? "",
    frameworkSourceReferenceId: input.frameworkSourceReferenceId ?? "",
    frameworkSourceVersion: input.frameworkSourceVersion ?? "",
    industrySourceReferenceId: input.industrySourceReferenceId ?? "",
    industrySourceVersion: input.industrySourceVersion ?? "",
    differencesCatalogConsultationReferenceId: getDifferencesCatalogConsultationReferenceId(input) ?? "",
    resolvedTreatmentReferenceId: input.resolvedTreatmentReferenceId ?? "",
    displacementJustification: input.displacementJustification ?? "",
    displacementLineage: getInputArray(input.displacementLineage),
    conflictReportReferenceId: input.conflictReportReferenceId ?? "",
    frameworkChangeGovernanceReferenceId: input.frameworkChangeGovernanceReferenceId ?? "",
  });
}

function buildComposedTreatmentId(input: BuildComposedTreatmentInput): string {
  return `synthetic-composed-treatment:${stableSnapshotHash({
    composedTreatmentKey: buildComposedTreatmentKey(input),
    artifactType: "SyntheticComposedTreatment",
  })}`;
}

function buildDerivationHash(input: BuildComposedTreatmentInput, composedPhiDerivationStatus: PhiDerivationStatus): string {
  return stableSnapshotHash({
    composedTreatmentKey: buildComposedTreatmentKey(input),
    compositionOutcome: input.compositionOutcome ?? "",
    compositionIsDeterministic: true,
    reconstructionGradeLineage: true,
    frameworkIsBaseIndustryIsOverlay: true,
    industryMayNotViolateFramework: true,
    phiDerivationStatusPropagatesMostRestrictive: true,
    composedPhiDerivationStatus,
  });
}

function buildComposedTreatmentBase(
  input: BuildComposedTreatmentInput,
  composedPhiDerivationStatus: PhiDerivationStatus,
): SyntheticComposedTreatmentBase {
  const base = getSharedBase(input, composedPhiDerivationStatus);
  const differencesCatalogConsultationReferenceId = getDifferencesCatalogConsultationReferenceId(input);

  return {
    ...base,
    composedTreatmentId: buildComposedTreatmentId(input),
    composedTreatmentKey: buildComposedTreatmentKey(input),
    queryTopicIdentifier: input.queryTopicIdentifier as string,
    queryIndustry: input.queryIndustry as string,
    querySubClassification: input.querySubClassification as string,
    queryFramework: input.queryFramework as IndustryBaseContract["reportingFramework"],
    queryEffectiveDate: input.queryEffectiveDate as string,
    frameworkSourceReferenceId: input.frameworkSourceReferenceId as string,
    frameworkSourceVersion: input.frameworkSourceVersion as string,
    industrySourceReferenceId: input.industrySourceReferenceId as string,
    industrySourceVersion: input.industrySourceVersion as string,
    ...(differencesCatalogConsultationReferenceId !== undefined
      ? { differencesCatalogConsultationReferenceId }
      : {}),
    compositionIsDeterministic: true,
    reconstructionGradeLineage: true,
    frameworkIsBaseIndustryIsOverlay: true,
    industryMayNotViolateFramework: true,
    phiDerivationStatusPropagatesMostRestrictive: true,
    composedPhiDerivationStatus,
    executable: false,
    derivationHash: buildDerivationHash(input, composedPhiDerivationStatus),
    composedTreatmentComplete: false,
    warnings: [],
  };
}

function getWarnings(input: BuildComposedTreatmentInput, variantFailures: string[]): string[] {
  return [
    ...getInputArray(input.warnings),
    ...variantFailures.map((failure) => `composition failed closed: ${failure}`),
    ...(input.compositionOutcome === "contradiction"
      ? ["contradiction emits conflict report only; no resolved treatment is produced"]
      : []),
    ...(input.compositionOutcome === "specializesWithDisplacement" && variantFailures.length > 0
      ? ["specializesWithDisplacement with incomplete displacement lineage is never emitted as a resolved treatment"]
      : []),
    "metadata-only composition contract; live composition against real treatments and Differences Catalog entries is deferred to real-data validation",
  ];
}

export function buildComposedTreatment(input: BuildComposedTreatmentInput): BuildComposedTreatmentResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      composedTreatment: null,
      skipped: true,
      warnings: [`missing required composed treatment identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const variantFailures = collectVariantFailures(input);

  if (variantFailures.length > 0) {
    return {
      composedTreatment: null,
      skipped: true,
      warnings: getWarnings(input, variantFailures),
    };
  }

  const composedPhiDerivationStatus = getMostRestrictivePhiDerivationStatus(
    input.frameworkPhiDerivationStatus,
    input.industryPhiDerivationStatus,
    input.phiDerivationStatus,
  );
  const base = buildComposedTreatmentBase(input, composedPhiDerivationStatus);
  const warnings = getWarnings(input, []);

  if (input.compositionOutcome === "specializes") {
    const composedTreatment: SyntheticComposedTreatmentSpecializes = {
      ...base,
      compositionOutcome: "specializes",
      resolvedTreatmentReferenceId: input.resolvedTreatmentReferenceId as string,
      specializationNotes: input.specializationNotes ?? "",
      warnings,
      composedTreatmentComplete: input.composedTreatmentComplete === true,
    };

    return { composedTreatment, skipped: false, warnings };
  }

  if (input.compositionOutcome === "specializesWithDisplacement") {
    const displacementLineage = getValidatedDisplacementLineage(input.displacementLineage);

    if (!displacementLineage) {
      return {
        composedTreatment: null,
        skipped: true,
        warnings: getWarnings(input, ["displacementLineage is incomplete or invalid"]),
      };
    }

    const composedTreatment: SyntheticComposedTreatmentSpecializesWithDisplacement = {
      ...base,
      compositionOutcome: "specializesWithDisplacement",
      resolvedTreatmentReferenceId: input.resolvedTreatmentReferenceId as string,
      displacementLineage,
      displacementJustification: input.displacementJustification as string,
      specialistReviewerRequiredForDisplacement: true,
      displacementLineageIsReconstructionGrade: true,
      failsClosedIfDisplacementLineageIncomplete: true,
      warnings,
      composedTreatmentComplete: input.composedTreatmentComplete === true,
    };

    return { composedTreatment, skipped: false, warnings };
  }

  const composedTreatment: SyntheticComposedTreatmentContradiction = {
    ...base,
    compositionOutcome: "contradiction",
    conflictReportReferenceId: input.conflictReportReferenceId as string,
    contradictionEmitsConflictReportNeverResolves: true,
    requiresFrameworkChangeGovernanceToReconcile: true,
    frameworkChangeGovernanceReferenceId: input.frameworkChangeGovernanceReferenceId as string,
    warnings,
    composedTreatmentComplete: input.composedTreatmentComplete === true,
  };

  return { composedTreatment, skipped: false, warnings };
}
