import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAuditConfidence } from "../confidence";
import type { SyntheticExpectedActivityObservation } from "../expected-activity";
import type { SyntheticAuditFinding } from "../findings";
import type { SyntheticMissingActivityObservation } from "../missing-activity";
import type { SyntheticRecurringPatternObservation } from "../recurring-patterns";
import type {
  SyntheticAuditCategory,
  SyntheticAuditConfidenceMetadata,
  SyntheticAuditContract,
  SyntheticAuditEvidenceReferences,
  SyntheticAuditExceptionMetadata,
  SyntheticAuditFindingMetadata,
  SyntheticAuditGovernanceMetadata,
  SyntheticAuditLearningCompatibility,
  SyntheticAuditMaterialityCompatibility,
  SyntheticAuditMemoryCompatibility,
  SyntheticAuditObservationMetadata,
  SyntheticAuditPackageCompatibility,
  SyntheticAuditPersonaCompatibility,
  SyntheticAuditRiskMetadata,
  SyntheticAuditScope,
  SyntheticAuditSurfaceCompatibility,
  SyntheticAuditTrustMetadata,
} from "../types";

export type SyntheticMaterialityObservationCategory =
  | "currently_material"
  | "potentially_material"
  | "recurring_materiality_risk"
  | "accumulation_risk"
  | "trend_risk"
  | "covenant_risk"
  | "tax_risk"
  | "compliance_risk"
  | "cash_risk"
  | "audit_significance";

export const SYNTHETIC_MATERIALITY_OBSERVATION_CATEGORIES: SyntheticMaterialityObservationCategory[] = [
  "currently_material",
  "potentially_material",
  "recurring_materiality_risk",
  "accumulation_risk",
  "trend_risk",
  "covenant_risk",
  "tax_risk",
  "compliance_risk",
  "cash_risk",
  "audit_significance",
];

export interface BuildMaterialityObservationInput {
  materialityObservationKey: string;
  materialityCategory: SyntheticMaterialityObservationCategory;
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  missingActivityObservations?: SyntheticMissingActivityObservation[];
  expectedActivityObservations?: SyntheticExpectedActivityObservation[];
  recurringPatternObservations?: SyntheticRecurringPatternObservation[];
}

export interface SyntheticMaterialityObservation {
  materialityObservationId: string;
  materialityObservationKey: string;
  materialityCategory: SyntheticMaterialityObservationCategory;
  companyId: string;
  auditCategories: SyntheticAuditCategory[];
  scope: SyntheticAuditScope;
  recurringPatternObservationIds: string[];
  expectedActivityObservationIds: string[];
  missingActivityObservationIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditEvidencePackageIds: string[];
  auditCandidateIds: string[];
  auditContractReferenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  evidence: SyntheticAuditEvidenceReferences[];
  evidenceReferenceIds: string[];
  sourceReferenceIds: string[];
  lineageReferenceIds: string[];
  observationMetadata: SyntheticAuditObservationMetadata[];
  findingMetadata: SyntheticAuditFindingMetadata[];
  exceptionMetadata: SyntheticAuditExceptionMetadata[];
  riskMetadata: SyntheticAuditRiskMetadata[];
  trustMetadata: SyntheticAuditTrustMetadata[];
  confidenceMetadata: SyntheticAuditConfidenceMetadata[];
  governanceMetadata: SyntheticAuditGovernanceMetadata[];
  materialityCompatibility: SyntheticAuditMaterialityCompatibility[];
  personaCompatibility: SyntheticAuditPersonaCompatibility[];
  packageCompatibility: SyntheticAuditPackageCompatibility[];
  memoryCompatibility: SyntheticAuditMemoryCompatibility[];
  learningCompatibility: SyntheticAuditLearningCompatibility[];
  surfaceCompatibility: SyntheticAuditSurfaceCompatibility[];
  auditContracts: SyntheticAuditContract[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  missingActivityObservations: SyntheticMissingActivityObservation[];
  expectedActivityObservations: SyntheticExpectedActivityObservation[];
  recurringPatternObservations: SyntheticRecurringPatternObservation[];
  warnings: string[];
}

export interface BuildMaterialityObservationResult {
  materialityObservation: SyntheticMaterialityObservation | null;
  skipped: boolean;
  warnings: string[];
}

type MaterialitySource =
  | SyntheticAuditFinding
  | SyntheticAuditConfidence
  | SyntheticMissingActivityObservation
  | SyntheticExpectedActivityObservation
  | SyntheticRecurringPatternObservation;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function hasArrayValue(values: string[] | undefined): boolean {
  return Array.isArray(values) && values.some(hasValue);
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(hasValue))];
}

function compactDefined<T>(values: Array<T | undefined>): T[] {
  return values.filter((value): value is T => value !== undefined);
}

function isSupportedMaterialityCategory(category: SyntheticMaterialityObservationCategory): boolean {
  return SYNTHETIC_MATERIALITY_OBSERVATION_CATEGORIES.includes(category);
}

function getAuditFindings(input: BuildMaterialityObservationInput): SyntheticAuditFinding[] {
  return input.auditFindings ?? [];
}

function getAuditConfidencePackages(input: BuildMaterialityObservationInput): SyntheticAuditConfidence[] {
  return input.auditConfidencePackages ?? [];
}

function getMissingActivityObservations(input: BuildMaterialityObservationInput): SyntheticMissingActivityObservation[] {
  return input.missingActivityObservations ?? [];
}

function getExpectedActivityObservations(input: BuildMaterialityObservationInput): SyntheticExpectedActivityObservation[] {
  return input.expectedActivityObservations ?? [];
}

function getRecurringPatternObservations(input: BuildMaterialityObservationInput): SyntheticRecurringPatternObservation[] {
  return input.recurringPatternObservations ?? [];
}

function getAllSources(input: BuildMaterialityObservationInput): MaterialitySource[] {
  return [
    ...getAuditFindings(input),
    ...getAuditConfidencePackages(input),
    ...getMissingActivityObservations(input),
    ...getExpectedActivityObservations(input),
    ...getRecurringPatternObservations(input),
  ];
}

function getFirstSource(input: BuildMaterialityObservationInput): MaterialitySource | undefined {
  return getAllSources(input)[0];
}

function getActivitySources(input: BuildMaterialityObservationInput) {
  return [
    ...getMissingActivityObservations(input),
    ...getExpectedActivityObservations(input),
    ...getRecurringPatternObservations(input),
  ];
}

function getAuditContractReferenceIdsFromContract(auditContract: SyntheticAuditContract): string[] {
  return uniqueStable([
    auditContract.observationMetadata?.auditObservationId,
    auditContract.findingMetadata?.auditFindingId,
    auditContract.exceptionMetadata?.auditExceptionId,
    auditContract.riskMetadata?.auditRiskId,
    ...auditContract.evidence.sourceReferenceIds,
    ...auditContract.evidence.lineageReferenceIds,
  ].filter((value): value is string => value !== undefined));
}

function getEvidenceObjects(input: BuildMaterialityObservationInput): SyntheticAuditEvidenceReferences[] {
  return [
    ...getAuditFindings(input).map((finding) => finding.evidence),
    ...getAuditConfidencePackages(input).map((confidence) => confidence.evidence),
    ...getMissingActivityObservations(input).map((observation) => observation.evidence),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.evidence),
    ...getRecurringPatternObservations(input).map((observation) => observation.evidence),
  ];
}

function getAuditContractReferenceIds(input: BuildMaterialityObservationInput): string[] {
  return uniqueStable([
    ...getMissingActivityObservations(input).flatMap((observation) =>
      getAuditContractReferenceIdsFromContract(observation.auditContract),
    ),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.auditContractReferenceIds),
    ...getRecurringPatternObservations(input).flatMap((observation) => observation.auditContractReferenceIds),
  ]);
}

function getAuditContracts(input: BuildMaterialityObservationInput): SyntheticAuditContract[] {
  return [
    ...getMissingActivityObservations(input).map((observation) => observation.auditContract),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.auditContracts),
    ...getRecurringPatternObservations(input).map((observation) => observation.auditContract),
  ];
}

function getAuditCategories(input: BuildMaterialityObservationInput): SyntheticAuditCategory[] {
  return compactDefined([
    ...getAuditFindings(input).map((finding) => finding.auditCategory),
    ...getAuditConfidencePackages(input).map((confidence) => confidence.auditCategory),
    ...getMissingActivityObservations(input).map((observation) => observation.auditCategory),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.auditCategories),
    ...getRecurringPatternObservations(input).map((observation) => observation.auditCategory),
  ]);
}

function buildMaterialityObservationId(input: BuildMaterialityObservationInput): string {
  return `synthetic-materiality-observation:${stableSnapshotHash({
    materialityObservationKey: input.materialityObservationKey,
    materialityCategory: input.materialityCategory,
    companyId: getFirstSource(input)?.companyId ?? null,
    recurringPatternObservationIds: getRecurringPatternObservations(input).map(
      (observation) => observation.recurringPatternObservationId,
    ),
    expectedActivityObservationIds: getExpectedActivityObservations(input).map(
      (observation) => observation.expectedActivityObservationId,
    ),
    missingActivityObservationIds: getMissingActivityObservations(input).map(
      (observation) => observation.missingActivityObservationId,
    ),
    auditFindingArtifactIds: getAuditFindingArtifactIds(input),
    auditConfidenceIds: getAuditConfidenceIds(input),
    auditEvidencePackageIds: getAuditEvidencePackageIds(input),
    auditCandidateIds: getAuditCandidateIds(input),
    auditContractReferenceIds: getAuditContractReferenceIds(input),
    auditSurfaceIds: getAuditSurfaceIds(input),
    auditWatchlistIds: getAuditWatchlistIds(input),
    auditBriefingIds: getAuditBriefingIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    isolationBoundaryIds: getFirstSource(input)?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function getAuditFindingArtifactIds(input: BuildMaterialityObservationInput): string[] {
  return uniqueStable([
    ...getAuditFindings(input).map((finding) => finding.auditFindingArtifactId),
    ...getAuditConfidencePackages(input).map((confidence) => confidence.auditFindingArtifactId),
    ...getActivitySources(input).flatMap((observation) => observation.auditFindingArtifactIds),
  ]);
}

function getAuditFindingIds(input: BuildMaterialityObservationInput): string[] {
  return uniqueStable([
    ...getAuditFindings(input).map((finding) => finding.auditFindingId),
    ...getAuditConfidencePackages(input).map((confidence) => confidence.auditFindingId),
    ...getActivitySources(input).flatMap((observation) => observation.auditFindingIds),
  ]);
}

function getAuditConfidenceIds(input: BuildMaterialityObservationInput): string[] {
  return uniqueStable([
    ...getAuditConfidencePackages(input).map((confidence) => confidence.auditConfidenceId),
    ...getActivitySources(input).flatMap((observation) => observation.auditConfidenceIds),
  ]);
}

function getAuditEvidencePackageIds(input: BuildMaterialityObservationInput): string[] {
  return uniqueStable([
    ...getAuditFindings(input).map((finding) => finding.auditEvidencePackageId),
    ...getAuditConfidencePackages(input).map((confidence) => confidence.auditEvidencePackageId),
    ...getActivitySources(input).flatMap((observation) => observation.auditEvidencePackageIds),
  ]);
}

function getAuditCandidateIds(input: BuildMaterialityObservationInput): string[] {
  return uniqueStable([
    ...getAuditFindings(input).map((finding) => finding.auditCandidateId),
    ...getAuditConfidencePackages(input).map((confidence) => confidence.auditCandidateId),
    ...getActivitySources(input).flatMap((observation) => observation.auditCandidateIds),
  ]);
}

function getAuditSurfaceIds(input: BuildMaterialityObservationInput): string[] {
  return uniqueStable(getActivitySources(input).flatMap((observation) => observation.auditSurfaceIds));
}

function getAuditWatchlistIds(input: BuildMaterialityObservationInput): string[] {
  return uniqueStable(getActivitySources(input).flatMap((observation) => observation.auditWatchlistIds));
}

function getAuditBriefingIds(input: BuildMaterialityObservationInput): string[] {
  return uniqueStable(getActivitySources(input).flatMap((observation) => observation.auditBriefingIds));
}

function getEvidenceReferenceIds(input: BuildMaterialityObservationInput): string[] {
  return uniqueStable(getAllSources(input).flatMap((source) => source.evidenceReferenceIds));
}

function getSourceReferenceIds(input: BuildMaterialityObservationInput): string[] {
  return uniqueStable(getAllSources(input).flatMap((source) => source.sourceReferenceIds));
}

function getLineageReferenceIds(input: BuildMaterialityObservationInput): string[] {
  return uniqueStable(getAllSources(input).flatMap((source) => source.lineageReferenceIds));
}

function validateSources(input: BuildMaterialityObservationInput, warnings: string[]): void {
  const firstSource = getFirstSource(input);
  if (!firstSource) return;

  getAllSources(input).forEach((source, index) => {
    if (!hasValue(source.companyId)) warnings.push(`source[${index}].companyId is required.`);
    if (source.companyId !== firstSource.companyId) {
      warnings.push(`source[${index}].companyId must match the first source companyId.`);
    }
    if (!source.scope) {
      warnings.push(`source[${index}].scope is required.`);
      return;
    }
    if (!hasValue(source.scope.companyId)) warnings.push(`source[${index}].scope.companyId is required.`);
    if (source.scope.companyId !== source.companyId) warnings.push(`source[${index}].scope.companyId must match companyId.`);
    if (!hasArrayValue(source.scope.isolationBoundaryIds)) {
      warnings.push(`source[${index}].scope.isolationBoundaryIds must include at least one value.`);
    }
    if (!hasArrayValue(source.evidenceReferenceIds)) {
      warnings.push(`source[${index}].evidenceReferenceIds must include at least one value.`);
    }
    if (!hasArrayValue(source.sourceReferenceIds)) {
      warnings.push(`source[${index}].sourceReferenceIds must include at least one value.`);
    }
    if (!hasArrayValue(source.lineageReferenceIds)) {
      warnings.push(`source[${index}].lineageReferenceIds must include at least one value.`);
    }
  });
}

function validateInput(input: BuildMaterialityObservationInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.materialityObservationKey)) warnings.push("materialityObservationKey is required.");
  if (!hasValue(input.materialityCategory)) warnings.push("materialityCategory is required.");
  if (!isSupportedMaterialityCategory(input.materialityCategory)) {
    warnings.push("materialityCategory must be a supported materiality category.");
  }
  if (getAllSources(input).length === 0) {
    warnings.push("at least one materiality source artifact is required.");
  }

  for (const [sourceName, values] of [
    ["auditFindings", input.auditFindings],
    ["auditConfidencePackages", input.auditConfidencePackages],
    ["missingActivityObservations", input.missingActivityObservations],
    ["expectedActivityObservations", input.expectedActivityObservations],
    ["recurringPatternObservations", input.recurringPatternObservations],
  ] as const) {
    if (values !== undefined && !Array.isArray(values)) warnings.push(`${sourceName} must be an array.`);
  }

  validateSources(input, warnings);
  return warnings;
}

export function buildMaterialityObservation(input: BuildMaterialityObservationInput): BuildMaterialityObservationResult {
  const warnings = validateInput(input);
  const firstSource = getFirstSource(input);
  if (warnings.length > 0 || !firstSource) {
    return {
      materialityObservation: null,
      skipped: true,
      warnings,
    };
  }

  const auditFindings = getAuditFindings(input);
  const auditConfidencePackages = getAuditConfidencePackages(input);
  const missingActivityObservations = getMissingActivityObservations(input);
  const expectedActivityObservations = getExpectedActivityObservations(input);
  const recurringPatternObservations = getRecurringPatternObservations(input);
  const allSources = getAllSources(input);

  return {
    materialityObservation: {
      materialityObservationId: buildMaterialityObservationId(input),
      materialityObservationKey: input.materialityObservationKey,
      materialityCategory: input.materialityCategory,
      companyId: firstSource.companyId,
      auditCategories: getAuditCategories(input),
      scope: firstSource.scope,
      recurringPatternObservationIds: recurringPatternObservations.map(
        (observation) => observation.recurringPatternObservationId,
      ),
      expectedActivityObservationIds: expectedActivityObservations.map(
        (observation) => observation.expectedActivityObservationId,
      ),
      missingActivityObservationIds: missingActivityObservations.map(
        (observation) => observation.missingActivityObservationId,
      ),
      auditFindingArtifactIds: getAuditFindingArtifactIds(input),
      auditFindingIds: getAuditFindingIds(input),
      auditConfidenceIds: getAuditConfidenceIds(input),
      auditEvidencePackageIds: getAuditEvidencePackageIds(input),
      auditCandidateIds: getAuditCandidateIds(input),
      auditContractReferenceIds: getAuditContractReferenceIds(input),
      auditSurfaceIds: getAuditSurfaceIds(input),
      auditWatchlistIds: getAuditWatchlistIds(input),
      auditBriefingIds: getAuditBriefingIds(input),
      evidence: getEvidenceObjects(input),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      observationMetadata: compactDefined(allSources.flatMap((source) => source.observationMetadata)),
      findingMetadata: compactDefined(allSources.flatMap((source) => source.findingMetadata)),
      exceptionMetadata: compactDefined(allSources.flatMap((source) => source.exceptionMetadata)),
      riskMetadata: compactDefined(allSources.flatMap((source) => source.riskMetadata)),
      trustMetadata: compactDefined(allSources.flatMap((source) => source.trustMetadata)),
      confidenceMetadata: compactDefined(allSources.flatMap((source) => source.confidenceMetadata)),
      governanceMetadata: compactDefined(allSources.flatMap((source) => source.governanceMetadata)),
      materialityCompatibility: compactDefined(allSources.flatMap((source) => source.materialityCompatibility)),
      personaCompatibility: compactDefined(allSources.flatMap((source) => source.personaCompatibility)),
      packageCompatibility: compactDefined(allSources.flatMap((source) => source.packageCompatibility)),
      memoryCompatibility: compactDefined(allSources.flatMap((source) => source.memoryCompatibility)),
      learningCompatibility: compactDefined(allSources.flatMap((source) => source.learningCompatibility)),
      surfaceCompatibility: compactDefined(allSources.flatMap((source) => source.surfaceCompatibility)),
      auditContracts: getAuditContracts(input),
      auditFindings,
      auditConfidencePackages,
      missingActivityObservations,
      expectedActivityObservations,
      recurringPatternObservations,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
