import { stableSnapshotHash } from "../../../core/hash";
import type { StandardsBaseContract, StandardsReportingFramework } from "../contracts";
import type {
  FrameworkAgnosticMemoryCategory,
  TreatmentScopedMemoryCategory,
} from "../memory-reservation";

type FrameworkScopedRetrievalBase = Omit<StandardsBaseContract, "reportingFramework"> & {
  reportingFrameworks: StandardsReportingFramework[];
};

export type MemoryCategoryClass = "treatment_scoped" | "framework_agnostic";
export type RetrievalScope = "framework_partitioned" | "shared";
export type RetrievalStatus = "scoped" | "shared" | "fail_closed";
export type FailClosedReason =
  | "none"
  | "framework_unspecified"
  | "category_unknown"
  | "cross_framework_blocked";

const TREATMENT_SCOPED_MEMORY_CATEGORIES = [
  "revenue_recognition",
  "lease_accounting",
  "inventory_measurement",
  "impairment_measurement",
  "financial_instruments_measurement",
] as const satisfies readonly TreatmentScopedMemoryCategory[];

const FRAMEWORK_AGNOSTIC_MEMORY_CATEGORIES = [
  "fraud_detection",
  "obvious_error_reasonableness",
  "fte_to_payroll_consistency",
  "vendor_duplicate_detection",
  "structural_anomaly_patterns",
] as const satisfies readonly FrameworkAgnosticMemoryCategory[];

export interface BuildFrameworkScopedRetrievalInput extends Partial<FrameworkScopedRetrievalBase> {
  entityId?: string;
  memoryReservationReferenceId?: string;
  requestedFrameworks?: StandardsReportingFramework[];
  memoryCategory?: string;
  artifactFramework?: StandardsReportingFramework;
  retrievedReferenceIds?: string[];
  frameworkScopedRetrievalComplete?: boolean;
}

export interface SyntheticFrameworkScopedRetrieval extends FrameworkScopedRetrievalBase {
  frameworkScopedRetrievalId: string;
  frameworkScopedRetrievalKey: string;
  entityId: string;
  memoryReservationReferenceId: string;
  requestedFrameworks: StandardsReportingFramework[];
  memoryCategory: string;
  memoryCategoryClass: MemoryCategoryClass;
  retrievalScope: RetrievalScope;
  retrievalRequiresFrameworkSpecified: true;
  failsClosedWhenFrameworkUnspecified: true;
  crossFrameworkRetrievalReturnsEmpty: true;
  neverFallsBackToOtherFramework: true;
  treatmentScopedPartitionedByFramework: true;
  frameworkAgnosticSharedAcrossFrameworks: true;
  categoryClassDeterminesScope: true;
  retrievalStatus: RetrievalStatus;
  failClosedReason: FailClosedReason;
  retrievedReferenceIds: string[];
  frameworkScopedRetrievalComplete: boolean;
}

export interface BuildFrameworkScopedRetrievalResult {
  frameworkScopedRetrieval: SyntheticFrameworkScopedRetrieval | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function isTreatmentScopedMemoryCategory(
  memoryCategory: string,
): memoryCategory is TreatmentScopedMemoryCategory {
  return (TREATMENT_SCOPED_MEMORY_CATEGORIES as readonly string[]).includes(memoryCategory);
}

function isFrameworkAgnosticMemoryCategory(
  memoryCategory: string,
): memoryCategory is FrameworkAgnosticMemoryCategory {
  return (FRAMEWORK_AGNOSTIC_MEMORY_CATEGORIES as readonly string[]).includes(memoryCategory);
}

function classifyMemoryCategory(memoryCategory: string): {
  memoryCategoryClass: MemoryCategoryClass;
  retrievalScope: RetrievalScope;
} | null {
  if (isTreatmentScopedMemoryCategory(memoryCategory)) {
    return {
      memoryCategoryClass: "treatment_scoped",
      retrievalScope: "framework_partitioned",
    };
  }

  if (isFrameworkAgnosticMemoryCategory(memoryCategory)) {
    return {
      memoryCategoryClass: "framework_agnostic",
      retrievalScope: "shared",
    };
  }

  return null;
}

function getRequestedFrameworks(input: BuildFrameworkScopedRetrievalInput): StandardsReportingFramework[] {
  return getInputArray(input.requestedFrameworks);
}

function getReportingFrameworks(input: BuildFrameworkScopedRetrievalInput): StandardsReportingFramework[] {
  const explicitReportingFrameworks = getInputArray(input.reportingFrameworks);
  if (explicitReportingFrameworks.length > 0) {
    return explicitReportingFrameworks;
  }

  return getRequestedFrameworks(input);
}

function getSharedBase(input: Partial<FrameworkScopedRetrievalBase>): FrameworkScopedRetrievalBase {
  return {
    phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
    phase40_5IntegrationHandoffHandle: input.phase40_5IntegrationHandoffHandle ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase40_5SnapshotHash: input.boundPhase40_5SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    phase41_5StaleMarker: input.phase41_5StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    reportingFrameworks: getInputArray(input.reportingFrameworks),
    containsPHI: getContainsPHI(input.containsPHI),
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
  } as FrameworkScopedRetrievalBase;
}

function collectMissingRequiredIdentifiers(input: BuildFrameworkScopedRetrievalInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.entityId)) {
    missing.push("entityId");
  }

  if (!hasValue(input.memoryCategory)) {
    missing.push("memoryCategory");
  }

  if (!hasValue(input.memoryReservationReferenceId)) {
    missing.push("memoryReservationReferenceId");
  }

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
  }

  if (!hasValue(input.boundPhase40_5SnapshotHash)) {
    missing.push("boundPhase40_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!hasValue(input.boundPhase38SnapshotHash)) {
    missing.push("boundPhase38SnapshotHash");
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

function resolveRetrievalOutcome(input: BuildFrameworkScopedRetrievalInput): {
  memoryCategoryClass: MemoryCategoryClass;
  retrievalScope: RetrievalScope;
  retrievalStatus: RetrievalStatus;
  failClosedReason: FailClosedReason;
  retrievedReferenceIds: string[];
} {
  const memoryCategory = input.memoryCategory as string;
  const categoryClassification = classifyMemoryCategory(memoryCategory);
  const requestedFrameworks = getRequestedFrameworks(input);
  const candidateReferenceIds = getInputArray(input.retrievedReferenceIds);

  if (!categoryClassification) {
    return {
      memoryCategoryClass: "treatment_scoped",
      retrievalScope: "framework_partitioned",
      retrievalStatus: "fail_closed",
      failClosedReason: "category_unknown",
      retrievedReferenceIds: [],
    };
  }

  if (categoryClassification.memoryCategoryClass === "framework_agnostic") {
    return {
      memoryCategoryClass: categoryClassification.memoryCategoryClass,
      retrievalScope: categoryClassification.retrievalScope,
      retrievalStatus: "shared",
      failClosedReason: "none",
      retrievedReferenceIds: candidateReferenceIds,
    };
  }

  if (requestedFrameworks.length === 0) {
    return {
      memoryCategoryClass: categoryClassification.memoryCategoryClass,
      retrievalScope: categoryClassification.retrievalScope,
      retrievalStatus: "fail_closed",
      failClosedReason: "framework_unspecified",
      retrievedReferenceIds: [],
    };
  }

  if (
    input.artifactFramework &&
    !requestedFrameworks.includes(input.artifactFramework)
  ) {
    return {
      memoryCategoryClass: categoryClassification.memoryCategoryClass,
      retrievalScope: categoryClassification.retrievalScope,
      retrievalStatus: "fail_closed",
      failClosedReason: "cross_framework_blocked",
      retrievedReferenceIds: [],
    };
  }

  return {
    memoryCategoryClass: categoryClassification.memoryCategoryClass,
    retrievalScope: categoryClassification.retrievalScope,
    retrievalStatus: "scoped",
    failClosedReason: "none",
    retrievedReferenceIds: candidateReferenceIds,
  };
}

function buildFrameworkScopedRetrievalKey(input: BuildFrameworkScopedRetrievalInput): string {
  const outcome = resolveRetrievalOutcome(input);

  return stableSnapshotHash({
    entityId: input.entityId ?? "",
    memoryReservationReferenceId: input.memoryReservationReferenceId ?? "",
    memoryCategory: input.memoryCategory ?? "",
    requestedFrameworks: getRequestedFrameworks(input),
    artifactFramework: input.artifactFramework ?? "",
    memoryCategoryClass: outcome.memoryCategoryClass,
    retrievalScope: outcome.retrievalScope,
    retrievalStatus: outcome.retrievalStatus,
    failClosedReason: outcome.failClosedReason,
    reportingFrameworks: getReportingFrameworks(input),
  });
}

function buildFrameworkScopedRetrievalId(input: BuildFrameworkScopedRetrievalInput): string {
  return `synthetic-framework-scoped-retrieval:${stableSnapshotHash({
    frameworkScopedRetrievalKey: buildFrameworkScopedRetrievalKey(input),
    artifactType: "SyntheticFrameworkScopedRetrieval",
  })}`;
}

function buildDerivationHash(input: BuildFrameworkScopedRetrievalInput): string {
  const outcome = resolveRetrievalOutcome(input);

  return stableSnapshotHash({
    frameworkScopedRetrievalKey: buildFrameworkScopedRetrievalKey(input),
    retrievalRequiresFrameworkSpecified: true,
    failsClosedWhenFrameworkUnspecified: true,
    crossFrameworkRetrievalReturnsEmpty: true,
    neverFallsBackToOtherFramework: true,
    treatmentScopedPartitionedByFramework: true,
    frameworkAgnosticSharedAcrossFrameworks: true,
    categoryClassDeterminesScope: true,
    memoryCategoryClass: outcome.memoryCategoryClass,
    retrievalScope: outcome.retrievalScope,
    retrievalStatus: outcome.retrievalStatus,
    failClosedReason: outcome.failClosedReason,
  });
}

function getWarnings(
  input: BuildFrameworkScopedRetrievalInput,
  outcome: ReturnType<typeof resolveRetrievalOutcome>,
): string[] {
  const requestedFrameworks = getRequestedFrameworks(input);

  return [
    ...getInputArray(input.warnings),
    ...(outcome.failClosedReason === "category_unknown"
      ? ["memory category is not declared in the 41.5A treatment-scoped or framework-agnostic lists; retrieval fails closed without guessing category class"]
      : []),
    ...(outcome.failClosedReason === "framework_unspecified"
      ? ["treatment-scoped retrieval requires requestedFrameworks; retrieval fails closed when framework is unspecified"]
      : []),
    ...(outcome.failClosedReason === "cross_framework_blocked"
      ? ["cross-framework retrieval returns empty and never falls back to another framework's content"]
      : []),
    ...(outcome.memoryCategoryClass === "framework_agnostic" && requestedFrameworks.length === 0
      ? ["framework-agnostic retrieval is shared across frameworks and does not require requestedFrameworks"]
      : []),
    "framework scoping applies in addition to customerIsolation, firmIsolation, and clientIsolation; no retrieval crosses tenant isolation regardless of framework match",
    "metadata-only framework-scoped retrieval contract; live memory access, cross-framework contamination tests, and the named four-entity topology test are deferred to the 41.5V verifier and real-data validation",
  ];
}

export function buildFrameworkScopedRetrieval(
  input: BuildFrameworkScopedRetrievalInput,
): BuildFrameworkScopedRetrievalResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      frameworkScopedRetrieval: null,
      skipped: true,
      warnings: [
        `missing required framework-scoped retrieval identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredEntityId = input.entityId as string;
  const requiredMemoryCategory = input.memoryCategory as string;
  const requiredMemoryReservationReferenceId = input.memoryReservationReferenceId as string;
  const requestedFrameworks = getRequestedFrameworks(input);
  const reportingFrameworks = getReportingFrameworks(input);
  const outcome = resolveRetrievalOutcome(input);
  const base = getSharedBase({
    ...input,
    reportingFrameworks,
  });
  const frameworkScopedRetrieval: SyntheticFrameworkScopedRetrieval = {
    ...base,
    frameworkScopedRetrievalId: buildFrameworkScopedRetrievalId(input),
    frameworkScopedRetrievalKey: buildFrameworkScopedRetrievalKey(input),
    entityId: requiredEntityId,
    memoryReservationReferenceId: requiredMemoryReservationReferenceId,
    requestedFrameworks,
    memoryCategory: requiredMemoryCategory,
    memoryCategoryClass: outcome.memoryCategoryClass,
    retrievalScope: outcome.retrievalScope,
    retrievalRequiresFrameworkSpecified: true,
    failsClosedWhenFrameworkUnspecified: true,
    crossFrameworkRetrievalReturnsEmpty: true,
    neverFallsBackToOtherFramework: true,
    treatmentScopedPartitionedByFramework: true,
    frameworkAgnosticSharedAcrossFrameworks: true,
    categoryClassDeterminesScope: true,
    retrievalStatus: outcome.retrievalStatus,
    failClosedReason: outcome.failClosedReason,
    retrievedReferenceIds: outcome.retrievedReferenceIds,
    reportingFrameworks,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, outcome),
    frameworkScopedRetrievalComplete: input.frameworkScopedRetrievalComplete === true,
  };

  return {
    frameworkScopedRetrieval,
    skipped: false,
    warnings: frameworkScopedRetrieval.warnings,
  };
}
