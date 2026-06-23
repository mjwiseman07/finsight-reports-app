import { basisOf } from "../../standards/contracts/ReportingBasis";
import type { StandardsReportingFramework } from "../../standards/contracts/StandardsContracts";
import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAuditBriefing } from "../briefings";
import type { SyntheticAuditCandidate } from "../candidates";
import type { SyntheticAuditConfidence } from "../confidence";
import type { SyntheticAuditEvidencePackage } from "../evidence";
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

export type SyntheticLeaseIntelligenceCategory =
  | "lease_classification"
  | "rou_asset"
  | "lease_liability"
  | "lease_amortization_candidate"
  | "lease_modification"
  | "lease_renewal"
  | "short_term_lease"
  | "long_term_lease"
  | "lease_balance_change"
  | "lease_relationship_candidate"
  | "lease_reconciliation_risk"
  | "asc842_candidate"
  | "ifrs16_lessee_candidate";

export const SYNTHETIC_LEASE_INTELLIGENCE_CATEGORIES: SyntheticLeaseIntelligenceCategory[] = [
  "lease_classification",
  "rou_asset",
  "lease_liability",
  "lease_amortization_candidate",
  "lease_modification",
  "lease_renewal",
  "short_term_lease",
  "long_term_lease",
  "lease_balance_change",
  "lease_relationship_candidate",
  "lease_reconciliation_risk",
  "asc842_candidate",
  "ifrs16_lessee_candidate",
];

export interface BuildLeaseIntelligenceObservationInput {
  auditContract: SyntheticAuditContract | null;
  leaseIntelligenceObservationKey: string;
  leaseIntelligenceCategory: SyntheticLeaseIntelligenceCategory;
  reportingFramework?: StandardsReportingFramework;
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticLeaseIntelligenceObservation {
  leaseIntelligenceObservationId: string;
  leaseIntelligenceObservationKey: string;
  leaseIntelligenceCategory: SyntheticLeaseIntelligenceCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
  leaseReferenceIds: string[];
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
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildLeaseIntelligenceObservationResult {
  leaseIntelligenceObservation: SyntheticLeaseIntelligenceObservation | null;
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

function isSupportedLeaseIntelligenceCategory(category: SyntheticLeaseIntelligenceCategory): boolean {
  return SYNTHETIC_LEASE_INTELLIGENCE_CATEGORIES.includes(category);
}

function resolveLeaseIntelligenceCategory(
  category: SyntheticLeaseIntelligenceCategory,
  reportingFramework: StandardsReportingFramework,
): SyntheticLeaseIntelligenceCategory {
  const basis = basisOf(reportingFramework);

  if (category === "asc842_candidate") {
    return basis === "US_GAAP" ? "asc842_candidate" : "ifrs16_lessee_candidate";
  }

  if (category === "ifrs16_lessee_candidate") {
    return basis === "IFRS" ? "ifrs16_lessee_candidate" : "asc842_candidate";
  }

  return category;
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

function getAuditCandidates(input: BuildLeaseIntelligenceObservationInput): SyntheticAuditCandidate[] {
  return input.auditCandidates ?? [];
}

function getAuditEvidencePackages(input: BuildLeaseIntelligenceObservationInput): SyntheticAuditEvidencePackage[] {
  return input.auditEvidencePackages ?? [];
}

function getAuditFindings(input: BuildLeaseIntelligenceObservationInput): SyntheticAuditFinding[] {
  return input.auditFindings ?? [];
}

function getAuditConfidencePackages(input: BuildLeaseIntelligenceObservationInput): SyntheticAuditConfidence[] {
  return input.auditConfidencePackages ?? [];
}

function getAuditSurfaces(input: BuildLeaseIntelligenceObservationInput): SyntheticAuditSurface[] {
  return input.auditSurfaces ?? [];
}

function getAuditWatchlists(input: BuildLeaseIntelligenceObservationInput): SyntheticAuditWatchlist[] {
  return input.auditWatchlists ?? [];
}

function getAuditBriefings(input: BuildLeaseIntelligenceObservationInput): SyntheticAuditBriefing[] {
  return input.auditBriefings ?? [];
}

function getAllAuditArtifacts(input: BuildLeaseIntelligenceObservationInput): AuditArtifact[] {
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
  input: BuildLeaseIntelligenceObservationInput,
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

function getEvidenceReferenceIds(input: BuildLeaseIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildLeaseIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildLeaseIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
  ]);
}

function getLeaseReferenceIds(input: BuildLeaseIntelligenceObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.observationMetadata?.relatedScheduleIds ?? []),
    ...getAllAuditArtifacts(input).flatMap((artifact) => artifact.observationMetadata?.relatedScheduleIds ?? []),
    ...getSourceReferenceIds(input),
  ]);
}

function buildLeaseIntelligenceObservationId(
  input: BuildLeaseIntelligenceObservationInput,
  resolvedCategory: SyntheticLeaseIntelligenceCategory,
): string {
  return `synthetic-lease-intelligence-observation:${stableSnapshotHash({
    leaseIntelligenceObservationKey: input.leaseIntelligenceObservationKey,
    leaseIntelligenceCategory: resolvedCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    auditContractReferenceIds: getAuditContractReferenceIds(input.auditContract),
    auditCandidateIds: getAuditCandidates(input).map((candidate) => candidate.auditCandidateId),
    auditEvidencePackageIds: getAuditEvidencePackages(input).map(
      (auditEvidencePackage) => auditEvidencePackage.auditEvidencePackageId,
    ),
    auditFindingArtifactIds: getAuditFindings(input).map((auditFinding) => auditFinding.auditFindingArtifactId),
    auditConfidenceIds: getAuditConfidencePackages(input).map((auditConfidence) => auditConfidence.auditConfidenceId),
    auditSurfaceIds: getAuditSurfaces(input).map((auditSurface) => auditSurface.auditSurfaceId),
    auditWatchlistIds: getAuditWatchlists(input).map((auditWatchlist) => auditWatchlist.auditWatchlistId),
    auditBriefingIds: getAuditBriefings(input).map((auditBriefing) => auditBriefing.auditBriefingId),
    leaseReferenceIds: getLeaseReferenceIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    isolationBoundaryIds: input.auditContract?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateArtifacts(input: BuildLeaseIntelligenceObservationInput, warnings: string[]): void {
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
      const artifactId = artifact[idField as keyof typeof artifact];
      if (!hasValue(artifactId)) warnings.push(`${artifactName}[${index}].${idField} is required.`);
      if (!hasValue(artifact.companyId)) warnings.push(`${artifactName}[${index}].companyId is required.`);
      if (companyId !== undefined && artifact.companyId !== companyId) {
        warnings.push(`${artifactName}[${index}].companyId must align with auditContract.scope.companyId.`);
      }
    });
  }
}

function validateInput(input: BuildLeaseIntelligenceObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.leaseIntelligenceObservationKey)) warnings.push("leaseIntelligenceObservationKey is required.");
  if (!hasValue(input.leaseIntelligenceCategory)) warnings.push("leaseIntelligenceCategory is required.");
  if (!isSupportedLeaseIntelligenceCategory(input.leaseIntelligenceCategory)) {
    warnings.push("leaseIntelligenceCategory must be a supported lease intelligence category.");
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

  validateArtifacts(input, warnings);
  return warnings;
}

export function buildLeaseIntelligenceObservation(
  input: BuildLeaseIntelligenceObservationInput,
): BuildLeaseIntelligenceObservationResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.auditContract) {
    return {
      leaseIntelligenceObservation: null,
      skipped: true,
      warnings,
    };
  }

  const auditContract = input.auditContract;
  const reportingFramework = input.reportingFramework ?? "us_gaap";
  const resolvedLeaseIntelligenceCategory = resolveLeaseIntelligenceCategory(
    input.leaseIntelligenceCategory,
    reportingFramework,
  );
  const auditCandidates = getAuditCandidates(input);
  const auditEvidencePackages = getAuditEvidencePackages(input);
  const auditFindings = getAuditFindings(input);
  const auditConfidencePackages = getAuditConfidencePackages(input);
  const auditSurfaces = getAuditSurfaces(input);
  const auditWatchlists = getAuditWatchlists(input);
  const auditBriefings = getAuditBriefings(input);
  const allArtifacts = getAllAuditArtifacts(input);

  return {
    leaseIntelligenceObservation: {
      leaseIntelligenceObservationId: buildLeaseIntelligenceObservationId(input, resolvedLeaseIntelligenceCategory),
      leaseIntelligenceObservationKey: input.leaseIntelligenceObservationKey,
      leaseIntelligenceCategory: resolvedLeaseIntelligenceCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      auditContractReferenceIds: getAuditContractReferenceIds(auditContract),
      auditCandidateIds: auditCandidates.map((candidate) => candidate.auditCandidateId),
      auditEvidencePackageIds: auditEvidencePackages.map(
        (auditEvidencePackage) => auditEvidencePackage.auditEvidencePackageId,
      ),
      auditFindingArtifactIds: auditFindings.map((auditFinding) => auditFinding.auditFindingArtifactId),
      auditFindingIds: auditFindings.map((auditFinding) => auditFinding.auditFindingId),
      auditConfidenceIds: auditConfidencePackages.map((auditConfidence) => auditConfidence.auditConfidenceId),
      auditSurfaceIds: auditSurfaces.map((auditSurface) => auditSurface.auditSurfaceId),
      auditWatchlistIds: auditWatchlists.map((auditWatchlist) => auditWatchlist.auditWatchlistId),
      auditBriefingIds: auditBriefings.map((auditBriefing) => auditBriefing.auditBriefingId),
      leaseReferenceIds: getLeaseReferenceIds(input),
      evidence: auditContract.evidence,
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...allArtifacts.map((artifact) => artifact.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...allArtifacts.map((artifact) => artifact.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...allArtifacts.map((artifact) => artifact.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([auditContract.riskMetadata, ...allArtifacts.map((artifact) => artifact.riskMetadata)]),
      trustMetadata: compactDefined([auditContract.trustMetadata, ...allArtifacts.map((artifact) => artifact.trustMetadata)]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...allArtifacts.map((artifact) => artifact.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...allArtifacts.map((artifact) => artifact.governanceMetadata),
      ]),
      materialityCompatibility: compactDefined([
        auditContract.materialityCompatibility,
        ...allArtifacts.map((artifact) => artifact.materialityCompatibility),
      ]),
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...allArtifacts.map((artifact) => artifact.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...allArtifacts.map((artifact) => artifact.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...allArtifacts.map((artifact) => artifact.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...allArtifacts.map((artifact) => artifact.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...allArtifacts.map((artifact) => artifact.surfaceCompatibility),
      ]),
      auditContract,
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
