import { stableSnapshotHash } from "../../../core/hash";
import type {
  IndustryBaseContract,
  IndustryCompositionOutcome,
  PhiDerivationStatus,
  RecommendationOutputClassification,
} from "../contracts";

export interface DifferencesCatalogSupportedFilters {
  byIndustry: true;
  byFramework: true;
  byCompositionOutcome: true;
  byDateRange: true;
  byDisplacementAttestor: true;
}

export type DifferencesCatalogCompositionOutcomeFilter = IndustryCompositionOutcome;

export interface BuildDifferencesCatalogReadInterfaceInput extends Partial<IndustryBaseContract> {
  phase41_5DifferencesCatalogReferenceId?: string;
  differencesCatalogReadInterfaceComplete?: boolean;
}

export interface SyntheticDifferencesCatalogReadInterface extends IndustryBaseContract {
  differencesCatalogReadInterfaceId: string;
  differencesCatalogReadInterfaceKey: string;
  isReadOnlyInspectionInterface: true;
  consultsPhase41_5DifferencesCatalog: true;
  phase41_5DifferencesCatalogReferenceId: string;
  supportedFilters: DifferencesCatalogSupportedFilters;
  filterByCompositionOutcomeValues: [
    "specializes",
    "specializesWithDisplacement",
    "contradiction",
  ];
  doesNotModifyDifferencesCatalog: true;
  forProgrammaticAuditorAndSpecialistQueries: true;
  differencesCatalogReadInterfaceComplete: boolean;
}

export interface BuildDifferencesCatalogReadInterfaceResult {
  differencesCatalogReadInterface: SyntheticDifferencesCatalogReadInterface | null;
  skipped: boolean;
  warnings: string[];
}

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";

const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";

const SUPPORTED_FILTERS: DifferencesCatalogSupportedFilters = {
  byIndustry: true,
  byFramework: true,
  byCompositionOutcome: true,
  byDateRange: true,
  byDisplacementAttestor: true,
};

const FILTER_BY_COMPOSITION_OUTCOME_VALUES: [
  "specializes",
  "specializesWithDisplacement",
  "contradiction",
] = ["specializes", "specializesWithDisplacement", "contradiction"];

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

function getSharedBase(input: BuildDifferencesCatalogReadInterfaceInput): IndustryBaseContract {
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
    industryClassification: input.industryClassification ?? "composition_engine",
    industrySubClassification: input.industrySubClassification ?? "",
    industryStatus: input.industryStatus ?? "active",
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

function collectMissingRequiredIdentifiers(input: BuildDifferencesCatalogReadInterfaceInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.phase41_5DifferencesCatalogReferenceId)) {
    missing.push("phase41_5DifferencesCatalogReferenceId");
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

function buildDifferencesCatalogReadInterfaceKey(input: BuildDifferencesCatalogReadInterfaceInput): string {
  return stableSnapshotHash({
    phase41_5DifferencesCatalogReferenceId: input.phase41_5DifferencesCatalogReferenceId ?? "",
    supportedFilters: SUPPORTED_FILTERS,
    filterByCompositionOutcomeValues: FILTER_BY_COMPOSITION_OUTCOME_VALUES,
    isReadOnlyInspectionInterface: true,
    consultsPhase41_5DifferencesCatalog: true,
    doesNotModifyDifferencesCatalog: true,
    forProgrammaticAuditorAndSpecialistQueries: true,
  });
}

function buildDifferencesCatalogReadInterfaceId(input: BuildDifferencesCatalogReadInterfaceInput): string {
  return `synthetic-differences-catalog-read-interface:${stableSnapshotHash({
    differencesCatalogReadInterfaceKey: buildDifferencesCatalogReadInterfaceKey(input),
    artifactType: "SyntheticDifferencesCatalogReadInterface",
  })}`;
}

function buildDerivationHash(input: BuildDifferencesCatalogReadInterfaceInput): string {
  return stableSnapshotHash({
    differencesCatalogReadInterfaceKey: buildDifferencesCatalogReadInterfaceKey(input),
    isReadOnlyInspectionInterface: true,
    consultsPhase41_5DifferencesCatalog: true,
    doesNotModifyDifferencesCatalog: true,
    forProgrammaticAuditorAndSpecialistQueries: true,
  });
}

function getWarnings(input: BuildDifferencesCatalogReadInterfaceInput): string[] {
  return [
    ...getInputArray(input.warnings),
    "read-only Differences Catalog inspection interface contract only; live catalog reads are deferred to real-data validation",
  ];
}

export function buildDifferencesCatalogReadInterface(
  input: BuildDifferencesCatalogReadInterfaceInput,
): BuildDifferencesCatalogReadInterfaceResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      differencesCatalogReadInterface: null,
      skipped: true,
      warnings: [
        `missing required differences catalog read interface identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const base = getSharedBase(input);
  const differencesCatalogReadInterface: SyntheticDifferencesCatalogReadInterface = {
    ...base,
    differencesCatalogReadInterfaceId: buildDifferencesCatalogReadInterfaceId(input),
    differencesCatalogReadInterfaceKey: buildDifferencesCatalogReadInterfaceKey(input),
    isReadOnlyInspectionInterface: true,
    consultsPhase41_5DifferencesCatalog: true,
    phase41_5DifferencesCatalogReferenceId: input.phase41_5DifferencesCatalogReferenceId as string,
    supportedFilters: SUPPORTED_FILTERS,
    filterByCompositionOutcomeValues: FILTER_BY_COMPOSITION_OUTCOME_VALUES,
    doesNotModifyDifferencesCatalog: true,
    forProgrammaticAuditorAndSpecialistQueries: true,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input),
    differencesCatalogReadInterfaceComplete: input.differencesCatalogReadInterfaceComplete === true,
  };

  return {
    differencesCatalogReadInterface,
    skipped: false,
    warnings: differencesCatalogReadInterface.warnings,
  };
}
