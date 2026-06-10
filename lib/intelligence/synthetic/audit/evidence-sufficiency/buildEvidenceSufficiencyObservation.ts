import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAuditCoverageObservation } from "../audit-coverage";
import type { SyntheticBalanceSheetIntegrityObservation } from "../balance-sheet-integrity";
import type { SyntheticAuditBriefing } from "../briefings";
import type { SyntheticAuditCandidate } from "../candidates";
import type { SyntheticAuditConfidence } from "../confidence";
import type { SyntheticContinuousAuditObservation } from "../continuous-audit";
import type { SyntheticContinuousControllerObservation } from "../continuous-controller";
import type { SyntheticAuditEvidencePackage } from "../evidence";
import type { SyntheticFinancialStatementRelationshipObservation } from "../financial-statement-relationships";
import type { SyntheticAuditFinding } from "../findings";
import type { SyntheticAuditSurface } from "../surfaces";
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
import type { SyntheticAuditWatchlist } from "../watchlists";

export type SyntheticEvidenceSufficiencyCategory =
  | "evidence_exists_candidate"
  | "evidence_missing_candidate"
  | "evidence_incomplete_candidate"
  | "evidence_outdated_candidate"
  | "evidence_relevance_candidate"
  | "evidence_quality_candidate"
  | "evidence_support_candidate"
  | "schedule_support_candidate"
  | "reconciliation_support_candidate"
  | "audit_support_candidate"
  | "controller_support_candidate"
  | "evidence_sufficiency_candidate"
  | "audit_readiness_support_candidate";

export const SYNTHETIC_EVIDENCE_SUFFICIENCY_CATEGORIES: SyntheticEvidenceSufficiencyCategory[] = [
  "evidence_exists_candidate",
  "evidence_missing_candidate",
  "evidence_incomplete_candidate",
  "evidence_outdated_candidate",
  "evidence_relevance_candidate",
  "evidence_quality_candidate",
  "evidence_support_candidate",
  "schedule_support_candidate",
  "reconciliation_support_candidate",
  "audit_support_candidate",
  "controller_support_candidate",
  "evidence_sufficiency_candidate",
  "audit_readiness_support_candidate",
];

export interface BuildEvidenceSufficiencyObservationInput {
  auditContract: SyntheticAuditContract | null;
  evidenceSufficiencyObservationKey: string;
  evidenceSufficiencyCategory: SyntheticEvidenceSufficiencyCategory;
  auditCoverageObservations?: SyntheticAuditCoverageObservation[];
  continuousAuditObservations?: SyntheticContinuousAuditObservation[];
  continuousControllerObservations?: SyntheticContinuousControllerObservation[];
  financialStatementRelationshipObservations?: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations?: SyntheticBalanceSheetIntegrityObservation[];
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticEvidenceSufficiencyObservation {
  evidenceSufficiencyObservationId: string;
  evidenceSufficiencyObservationKey: string;
  evidenceSufficiencyCategory: SyntheticEvidenceSufficiencyCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  auditCoverageObservationIds: string[];
  continuousAuditObservationIds: string[];
  continuousControllerObservationIds: string[];
  financialStatementRelationshipObservationIds: string[];
  balanceSheetIntegrityObservationIds: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  evidenceSufficiencyReferenceIds: string[];
  evidence: SyntheticAuditEvidenceReferences;
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
  auditContract: SyntheticAuditContract;
  auditCoverageObservations: SyntheticAuditCoverageObservation[];
  continuousAuditObservations: SyntheticContinuousAuditObservation[];
  continuousControllerObservations: SyntheticContinuousControllerObservation[];
  financialStatementRelationshipObservations: SyntheticFinancialStatementRelationshipObservation[];
  balanceSheetIntegrityObservations: SyntheticBalanceSheetIntegrityObservation[];
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildEvidenceSufficiencyObservationResult {
  evidenceSufficiencyObservation: SyntheticEvidenceSufficiencyObservation | null;
  skipped: boolean;
  warnings: string[];
}

type AuditArtifact =
  | SyntheticAuditCandidate
  | SyntheticAuditEvidencePackage
  | SyntheticAuditFinding
  | SyntheticAuditConfidence
  | SyntheticAuditSurface
  | SyntheticAuditWatchlist
  | SyntheticAuditBriefing;

type DomainObservation =
  | SyntheticAuditCoverageObservation
  | SyntheticContinuousAuditObservation
  | SyntheticContinuousControllerObservation
  | SyntheticFinancialStatementRelationshipObservation
  | SyntheticBalanceSheetIntegrityObservation;

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

function getStringProperty(value: object, propertyName: string): string[] {
  const property = (value as Record<string, unknown>)[propertyName];
  return typeof property === "string" ? [property] : [];
}

function getStringArrayProperty(value: object, propertyName: string): string[] {
  const property = (value as Record<string, unknown>)[propertyName];
  return Array.isArray(property) ? property.filter((item): item is string => typeof item === "string") : [];
}

function isSupportedEvidenceSufficiencyCategory(category: SyntheticEvidenceSufficiencyCategory): boolean {
  return SYNTHETIC_EVIDENCE_SUFFICIENCY_CATEGORIES.includes(category);
}

function getAuditCategory(auditContract: SyntheticAuditContract): SyntheticAuditCategory | undefined {
  return (
    auditContract.observationMetadata?.auditCategory ??
    auditContract.findingMetadata?.auditCategory ??
    auditContract.exceptionMetadata?.auditCategory ??
    auditContract.riskMetadata?.auditCategory
  );
}

function getAuditContractReferenceIds(auditContract: SyntheticAuditContract | null): string[] {
  if (!auditContract) return [];

  return uniqueStable([
    auditContract.observationMetadata?.auditObservationId,
    auditContract.findingMetadata?.auditFindingId,
    auditContract.exceptionMetadata?.auditExceptionId,
    auditContract.riskMetadata?.auditRiskId,
    ...auditContract.evidence.sourceReferenceIds,
    ...auditContract.evidence.lineageReferenceIds,
  ].filter((value): value is string => value !== undefined));
}

function getAuditCoverageObservations(input: BuildEvidenceSufficiencyObservationInput): SyntheticAuditCoverageObservation[] {
  return input.auditCoverageObservations ?? [];
}

function getContinuousAuditObservations(
  input: BuildEvidenceSufficiencyObservationInput,
): SyntheticContinuousAuditObservation[] {
  return input.continuousAuditObservations ?? [];
}

function getContinuousControllerObservations(
  input: BuildEvidenceSufficiencyObservationInput,
): SyntheticContinuousControllerObservation[] {
  return input.continuousControllerObservations ?? [];
}

function getFinancialStatementRelationshipObservations(
  input: BuildEvidenceSufficiencyObservationInput,
): SyntheticFinancialStatementRelationshipObservation[] {
  return input.financialStatementRelationshipObservations ?? [];
}

function getBalanceSheetIntegrityObservations(
  input: BuildEvidenceSufficiencyObservationInput,
): SyntheticBalanceSheetIntegrityObservation[] {
  return input.balanceSheetIntegrityObservations ?? [];
}

function getDomainObservations(input: BuildEvidenceSufficiencyObservationInput): DomainObservation[] {
  return [
    ...getAuditCoverageObservations(input),
    ...getContinuousAuditObservations(input),
    ...getContinuousControllerObservations(input),
    ...getFinancialStatementRelationshipObservations(input),
    ...getBalanceSheetIntegrityObservations(input),
  ];
}

function getAuditCandidates(input: BuildEvidenceSufficiencyObservationInput): SyntheticAuditCandidate[] {
  return input.auditCandidates ?? [];
}

function getAuditEvidencePackages(input: BuildEvidenceSufficiencyObservationInput): SyntheticAuditEvidencePackage[] {
  return input.auditEvidencePackages ?? [];
}

function getAuditFindings(input: BuildEvidenceSufficiencyObservationInput): SyntheticAuditFinding[] {
  return input.auditFindings ?? [];
}

function getAuditConfidencePackages(input: BuildEvidenceSufficiencyObservationInput): SyntheticAuditConfidence[] {
  return input.auditConfidencePackages ?? [];
}

function getAuditSurfaces(input: BuildEvidenceSufficiencyObservationInput): SyntheticAuditSurface[] {
  return input.auditSurfaces ?? [];
}

function getAuditWatchlists(input: BuildEvidenceSufficiencyObservationInput): SyntheticAuditWatchlist[] {
  return input.auditWatchlists ?? [];
}

function getAuditBriefings(input: BuildEvidenceSufficiencyObservationInput): SyntheticAuditBriefing[] {
  return input.auditBriefings ?? [];
}

function getAllAuditArtifacts(input: BuildEvidenceSufficiencyObservationInput): AuditArtifact[] {
  return [
    ...getAuditCandidates(input),
    ...getAuditEvidencePackages(input),
    ...getAuditFindings(input),
    ...getAuditConfidencePackages(input),
    ...getAuditSurfaces(input),
    ...getAuditWatchlists(input),
    ...getAuditBriefings(input),
  ];
}

function getPackagedAuditArtifacts(
  input: BuildEvidenceSufficiencyObservationInput,
): Array<
  | SyntheticAuditEvidencePackage
  | SyntheticAuditFinding
  | SyntheticAuditConfidence
  | SyntheticAuditSurface
  | SyntheticAuditWatchlist
  | SyntheticAuditBriefing
> {
  return [
    ...getAuditEvidencePackages(input),
    ...getAuditFindings(input),
    ...getAuditConfidencePackages(input),
    ...getAuditSurfaces(input),
    ...getAuditWatchlists(input),
    ...getAuditBriefings(input),
  ];
}

function getObservationIds(observations: object[], propertyName: string): string[] {
  return observations.flatMap((observation) => getStringProperty(observation, propertyName));
}

function getEvidenceReferenceIds(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => observation.evidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => observation.sourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getDomainObservations(input).flatMap((observation) => observation.lineageReferenceIds),
  ]);
}

function getAuditContractReferenceIdsFromInput(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...getAuditContractReferenceIds(input.auditContract),
    ...getAllAuditArtifacts(input).flatMap((artifact) => getStringArrayProperty(artifact, "auditContractReferenceIds")),
    ...getDomainObservations(input).flatMap((observation) => observation.auditContractReferenceIds),
  ]);
}

function getAuditCandidateIds(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditCandidateId"),
      ...getStringArrayProperty(artifact, "auditCandidateIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditCandidateIds),
  ]);
}

function getAuditEvidencePackageIds(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditEvidencePackageId"),
      ...getStringArrayProperty(artifact, "auditEvidencePackageIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditEvidencePackageIds),
  ]);
}

function getAuditFindingArtifactIds(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditFindingArtifactId"),
      ...getStringArrayProperty(artifact, "auditFindingArtifactIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditFindingArtifactIds),
  ]);
}

function getAuditFindingIds(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditFindingId"),
      ...getStringArrayProperty(artifact, "auditFindingIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditFindingIds),
  ]);
}

function getAuditConfidenceIds(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditConfidenceId"),
      ...getStringArrayProperty(artifact, "auditConfidenceIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditConfidenceIds),
  ]);
}

function getAuditSurfaceIds(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditSurfaceId"),
      ...getStringArrayProperty(artifact, "auditSurfaceIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditSurfaceIds),
  ]);
}

function getAuditWatchlistIds(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditWatchlistId"),
      ...getStringArrayProperty(artifact, "auditWatchlistIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditWatchlistIds),
  ]);
}

function getAuditBriefingIds(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...getAllAuditArtifacts(input).flatMap((artifact) => [
      ...getStringProperty(artifact, "auditBriefingId"),
      ...getStringArrayProperty(artifact, "auditBriefingIds"),
    ]),
    ...getDomainObservations(input).flatMap((observation) => observation.auditBriefingIds),
  ]);
}

function getEvidenceSufficiencyReferenceIds(input: BuildEvidenceSufficiencyObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.observationMetadata?.sourceArtifactIds ?? []),
    ...(input.auditContract?.observationMetadata?.relatedScheduleIds ?? []),
    ...getAllAuditArtifacts(input).flatMap((artifact) => artifact.observationMetadata?.sourceArtifactIds ?? []),
    ...getAllAuditArtifacts(input).flatMap((artifact) => artifact.observationMetadata?.relatedScheduleIds ?? []),
    ...getDomainObservations(input).flatMap((observation) =>
      observation.observationMetadata.flatMap((metadata) => metadata.sourceArtifactIds),
    ),
    ...getDomainObservations(input).flatMap((observation) =>
      observation.observationMetadata.flatMap((metadata) => metadata.relatedScheduleIds),
    ),
    ...getSourceReferenceIds(input),
  ]);
}

function buildEvidenceSufficiencyObservationId(input: BuildEvidenceSufficiencyObservationInput): string {
  return `synthetic-evidence-sufficiency-observation:${stableSnapshotHash({
    evidenceSufficiencyObservationKey: input.evidenceSufficiencyObservationKey,
    evidenceSufficiencyCategory: input.evidenceSufficiencyCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    auditCoverageObservationIds: getObservationIds(getAuditCoverageObservations(input), "auditCoverageObservationId"),
    continuousAuditObservationIds: getObservationIds(getContinuousAuditObservations(input), "continuousAuditObservationId"),
    continuousControllerObservationIds: getObservationIds(
      getContinuousControllerObservations(input),
      "continuousControllerObservationId",
    ),
    financialStatementRelationshipObservationIds: getObservationIds(
      getFinancialStatementRelationshipObservations(input),
      "financialStatementRelationshipObservationId",
    ),
    balanceSheetIntegrityObservationIds: getObservationIds(
      getBalanceSheetIntegrityObservations(input),
      "balanceSheetIntegrityObservationId",
    ),
    auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
    auditCandidateIds: getAuditCandidateIds(input),
    auditEvidencePackageIds: getAuditEvidencePackageIds(input),
    auditFindingArtifactIds: getAuditFindingArtifactIds(input),
    auditConfidenceIds: getAuditConfidenceIds(input),
    auditSurfaceIds: getAuditSurfaceIds(input),
    auditWatchlistIds: getAuditWatchlistIds(input),
    auditBriefingIds: getAuditBriefingIds(input),
    evidenceSufficiencyReferenceIds: getEvidenceSufficiencyReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    isolationBoundaryIds: input.auditContract?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateAuditArtifacts(input: BuildEvidenceSufficiencyObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [artifactName, artifacts, idField] of [
    ["auditCandidates", getAuditCandidates(input), "auditCandidateId"],
    ["auditEvidencePackages", getAuditEvidencePackages(input), "auditEvidencePackageId"],
    ["auditFindings", getAuditFindings(input), "auditFindingArtifactId"],
    ["auditConfidencePackages", getAuditConfidencePackages(input), "auditConfidenceId"],
    ["auditSurfaces", getAuditSurfaces(input), "auditSurfaceId"],
    ["auditWatchlists", getAuditWatchlists(input), "auditWatchlistId"],
    ["auditBriefings", getAuditBriefings(input), "auditBriefingId"],
  ] as const) {
    artifacts.forEach((artifact, index) => {
      const artifactId = getStringProperty(artifact, idField)[0];
      if (!hasValue(artifactId)) warnings.push(`${artifactName}[${index}].${idField} is required.`);
      if (!hasValue(artifact.companyId)) warnings.push(`${artifactName}[${index}].companyId is required.`);
      if (companyId !== undefined && artifact.companyId !== companyId) {
        warnings.push(`${artifactName}[${index}].companyId must align with auditContract.scope.companyId.`);
      }
    });
  }
}

function validateDomainObservationIds(input: BuildEvidenceSufficiencyObservationInput, warnings: string[]): void {
  const companyId = input.auditContract?.scope.companyId;
  for (const [observationName, observations, idField] of [
    ["auditCoverageObservations", getAuditCoverageObservations(input), "auditCoverageObservationId"],
    ["continuousAuditObservations", getContinuousAuditObservations(input), "continuousAuditObservationId"],
    ["continuousControllerObservations", getContinuousControllerObservations(input), "continuousControllerObservationId"],
    [
      "financialStatementRelationshipObservations",
      getFinancialStatementRelationshipObservations(input),
      "financialStatementRelationshipObservationId",
    ],
    ["balanceSheetIntegrityObservations", getBalanceSheetIntegrityObservations(input), "balanceSheetIntegrityObservationId"],
  ] as const) {
    observations.forEach((observation, index) => {
      const observationId = getStringProperty(observation, idField)[0];
      if (!hasValue(observationId)) warnings.push(`${observationName}[${index}].${idField} is required.`);
      if (!hasValue(observation.companyId)) warnings.push(`${observationName}[${index}].companyId is required.`);
      if (companyId !== undefined && observation.companyId !== companyId) {
        warnings.push(`${observationName}[${index}].companyId must align with auditContract.scope.companyId.`);
      }
    });
  }
}

function validateInput(input: BuildEvidenceSufficiencyObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.evidenceSufficiencyObservationKey)) warnings.push("evidenceSufficiencyObservationKey is required.");
  if (!hasValue(input.evidenceSufficiencyCategory)) warnings.push("evidenceSufficiencyCategory is required.");
  if (!isSupportedEvidenceSufficiencyCategory(input.evidenceSufficiencyCategory)) {
    warnings.push("evidenceSufficiencyCategory must be a supported evidence sufficiency category.");
  }
  if (!auditContract.scope) warnings.push("auditContract.scope is required.");
  if (!auditContract.evidence) warnings.push("auditContract.evidence is required.");
  if (!auditContract.scope || !auditContract.evidence) return warnings;

  if (!hasValue(auditContract.scope.companyId)) warnings.push("scope.companyId is required.");
  if (!hasArrayValue(auditContract.scope.isolationBoundaryIds)) {
    warnings.push("scope.isolationBoundaryIds must include at least one value.");
  }
  if (!hasArrayValue(auditContract.evidence.evidenceIds)) {
    warnings.push("evidence.evidenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditContract.evidence.sourceReferenceIds)) {
    warnings.push("evidence.sourceReferenceIds must include at least one value.");
  }
  if (!hasArrayValue(auditContract.evidence.lineageReferenceIds)) {
    warnings.push("evidence.lineageReferenceIds must include at least one value.");
  }

  validateAuditArtifacts(input, warnings);
  validateDomainObservationIds(input, warnings);
  return warnings;
}

export function buildEvidenceSufficiencyObservation(
  input: BuildEvidenceSufficiencyObservationInput,
): BuildEvidenceSufficiencyObservationResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.auditContract) {
    return {
      evidenceSufficiencyObservation: null,
      skipped: true,
      warnings,
    };
  }

  const auditContract = input.auditContract;
  const auditCoverageObservations = getAuditCoverageObservations(input);
  const continuousAuditObservations = getContinuousAuditObservations(input);
  const continuousControllerObservations = getContinuousControllerObservations(input);
  const financialStatementRelationshipObservations = getFinancialStatementRelationshipObservations(input);
  const balanceSheetIntegrityObservations = getBalanceSheetIntegrityObservations(input);
  const auditCandidates = getAuditCandidates(input);
  const auditEvidencePackages = getAuditEvidencePackages(input);
  const auditFindings = getAuditFindings(input);
  const auditConfidencePackages = getAuditConfidencePackages(input);
  const auditSurfaces = getAuditSurfaces(input);
  const auditWatchlists = getAuditWatchlists(input);
  const auditBriefings = getAuditBriefings(input);
  const allArtifacts = getAllAuditArtifacts(input);
  const domainObservations = getDomainObservations(input);

  return {
    evidenceSufficiencyObservation: {
      evidenceSufficiencyObservationId: buildEvidenceSufficiencyObservationId(input),
      evidenceSufficiencyObservationKey: input.evidenceSufficiencyObservationKey,
      evidenceSufficiencyCategory: input.evidenceSufficiencyCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      auditCoverageObservationIds: getObservationIds(auditCoverageObservations, "auditCoverageObservationId"),
      continuousAuditObservationIds: getObservationIds(continuousAuditObservations, "continuousAuditObservationId"),
      continuousControllerObservationIds: getObservationIds(
        continuousControllerObservations,
        "continuousControllerObservationId",
      ),
      financialStatementRelationshipObservationIds: getObservationIds(
        financialStatementRelationshipObservations,
        "financialStatementRelationshipObservationId",
      ),
      balanceSheetIntegrityObservationIds: getObservationIds(
        balanceSheetIntegrityObservations,
        "balanceSheetIntegrityObservationId",
      ),
      auditContractReferenceIds: getAuditContractReferenceIdsFromInput(input),
      auditCandidateIds: getAuditCandidateIds(input),
      auditEvidencePackageIds: getAuditEvidencePackageIds(input),
      auditFindingArtifactIds: getAuditFindingArtifactIds(input),
      auditFindingIds: getAuditFindingIds(input),
      auditConfidenceIds: getAuditConfidenceIds(input),
      auditSurfaceIds: getAuditSurfaceIds(input),
      auditWatchlistIds: getAuditWatchlistIds(input),
      auditBriefingIds: getAuditBriefingIds(input),
      evidenceSufficiencyReferenceIds: getEvidenceSufficiencyReferenceIds(input),
      evidence: auditContract.evidence,
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...allArtifacts.map((artifact) => artifact.observationMetadata),
        ...domainObservations.flatMap((observation) => observation.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...allArtifacts.map((artifact) => artifact.findingMetadata),
        ...domainObservations.flatMap((observation) => observation.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...allArtifacts.map((artifact) => artifact.exceptionMetadata),
        ...domainObservations.flatMap((observation) => observation.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...allArtifacts.map((artifact) => artifact.riskMetadata),
        ...domainObservations.flatMap((observation) => observation.riskMetadata),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...allArtifacts.map((artifact) => artifact.trustMetadata),
        ...domainObservations.flatMap((observation) => observation.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...allArtifacts.map((artifact) => artifact.confidenceMetadata),
        ...domainObservations.flatMap((observation) => observation.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...allArtifacts.map((artifact) => artifact.governanceMetadata),
        ...domainObservations.flatMap((observation) => observation.governanceMetadata),
      ]),
      materialityCompatibility: compactDefined([
        auditContract.materialityCompatibility,
        ...allArtifacts.map((artifact) => artifact.materialityCompatibility),
        ...domainObservations.flatMap((observation) => observation.materialityCompatibility),
      ]),
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...allArtifacts.map((artifact) => artifact.personaCompatibility),
        ...domainObservations.flatMap((observation) => observation.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...allArtifacts.map((artifact) => artifact.packageCompatibility),
        ...domainObservations.flatMap((observation) => observation.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...allArtifacts.map((artifact) => artifact.memoryCompatibility),
        ...domainObservations.flatMap((observation) => observation.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...allArtifacts.map((artifact) => artifact.learningCompatibility),
        ...domainObservations.flatMap((observation) => observation.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...allArtifacts.map((artifact) => artifact.surfaceCompatibility),
        ...domainObservations.flatMap((observation) => observation.surfaceCompatibility),
      ]),
      auditContract,
      auditCoverageObservations,
      continuousAuditObservations,
      continuousControllerObservations,
      financialStatementRelationshipObservations,
      balanceSheetIntegrityObservations,
      auditCandidates,
      auditEvidencePackages,
      auditFindings,
      auditConfidencePackages,
      auditSurfaces,
      auditWatchlists,
      auditBriefings,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
