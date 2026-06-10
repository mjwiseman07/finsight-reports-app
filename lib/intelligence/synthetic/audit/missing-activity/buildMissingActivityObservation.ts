import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAuditBriefing } from "../briefings";
import type { SyntheticAuditCandidate } from "../candidates";
import type { SyntheticAuditConfidence } from "../confidence";
import type { SyntheticAuditEvidencePackage } from "../evidence";
import type { SyntheticExpectedActivityObservation } from "../expected-activity";
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

export type SyntheticMissingActivityCategory =
  | "missing_vendor_invoice"
  | "missing_accrual"
  | "missing_payroll_accrual"
  | "missing_recurring_journal"
  | "missing_depreciation_entry"
  | "missing_amortization_entry"
  | "missing_revenue_activity"
  | "missing_customer_billing"
  | "missing_reconciliation"
  | "missing_debt_payment"
  | "missing_lease_payment"
  | "missing_tax_remittance"
  | "missing_inventory_activity"
  | "missing_reserve_update";

export const SYNTHETIC_MISSING_ACTIVITY_CATEGORIES: SyntheticMissingActivityCategory[] = [
  "missing_vendor_invoice",
  "missing_accrual",
  "missing_payroll_accrual",
  "missing_recurring_journal",
  "missing_depreciation_entry",
  "missing_amortization_entry",
  "missing_revenue_activity",
  "missing_customer_billing",
  "missing_reconciliation",
  "missing_debt_payment",
  "missing_lease_payment",
  "missing_tax_remittance",
  "missing_inventory_activity",
  "missing_reserve_update",
];

export interface BuildMissingActivityObservationInput {
  auditContract: SyntheticAuditContract | null;
  missingActivityObservationKey: string;
  missingActivityCategory: SyntheticMissingActivityCategory;
  auditCandidates?: SyntheticAuditCandidate[];
  auditEvidencePackages?: SyntheticAuditEvidencePackage[];
  auditFindings?: SyntheticAuditFinding[];
  auditConfidencePackages?: SyntheticAuditConfidence[];
  expectedActivityObservations?: SyntheticExpectedActivityObservation[];
  auditSurfaces?: SyntheticAuditSurface[];
  auditWatchlists?: SyntheticAuditWatchlist[];
  auditBriefings?: SyntheticAuditBriefing[];
}

export interface SyntheticMissingActivityObservation {
  missingActivityObservationId: string;
  missingActivityObservationKey: string;
  missingActivityCategory: SyntheticMissingActivityCategory;
  companyId: string;
  auditCategory?: SyntheticAuditCategory;
  scope: SyntheticAuditScope;
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
  expectedActivityObservationIds: string[];
  expectedActivityCategories: string[];
  recurringPatternObservationIds: string[];
  recurringPatternObservationKeys: string[];
  recurringPatternCategories: string[];
  auditContractReferenceIds: string[];
  auditSurfaceIds: string[];
  auditWatchlistIds: string[];
  auditBriefingIds: string[];
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
  expectedActivityObservations: SyntheticExpectedActivityObservation[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  warnings: string[];
}

export interface BuildMissingActivityObservationResult {
  missingActivityObservation: SyntheticMissingActivityObservation | null;
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

function isSupportedMissingActivityCategory(category: SyntheticMissingActivityCategory): boolean {
  return SYNTHETIC_MISSING_ACTIVITY_CATEGORIES.includes(category);
}

function getAuditCategory(auditContract: SyntheticAuditContract): SyntheticAuditCategory | undefined {
  return (
    auditContract.observationMetadata?.auditCategory ??
    auditContract.findingMetadata?.auditCategory ??
    auditContract.exceptionMetadata?.auditCategory ??
    auditContract.riskMetadata?.auditCategory
  );
}

function getAuditCandidates(input: BuildMissingActivityObservationInput): SyntheticAuditCandidate[] {
  return input.auditCandidates ?? [];
}

function getAuditEvidencePackages(input: BuildMissingActivityObservationInput): SyntheticAuditEvidencePackage[] {
  return input.auditEvidencePackages ?? [];
}

function getAuditFindings(input: BuildMissingActivityObservationInput): SyntheticAuditFinding[] {
  return input.auditFindings ?? [];
}

function getAuditConfidencePackages(input: BuildMissingActivityObservationInput): SyntheticAuditConfidence[] {
  return input.auditConfidencePackages ?? [];
}

function getExpectedActivityObservations(
  input: BuildMissingActivityObservationInput,
): SyntheticExpectedActivityObservation[] {
  return input.expectedActivityObservations ?? [];
}

function getAuditSurfaces(input: BuildMissingActivityObservationInput): SyntheticAuditSurface[] {
  return input.auditSurfaces ?? [];
}

function getAuditWatchlists(input: BuildMissingActivityObservationInput): SyntheticAuditWatchlist[] {
  return input.auditWatchlists ?? [];
}

function getAuditBriefings(input: BuildMissingActivityObservationInput): SyntheticAuditBriefing[] {
  return input.auditBriefings ?? [];
}

function getAllAuditArtifacts(input: BuildMissingActivityObservationInput): AuditArtifact[] {
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
  input: BuildMissingActivityObservationInput,
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

function getEvidenceReferenceIds(input: BuildMissingActivityObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.evidenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.evidenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.evidenceReferenceIds),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.evidenceReferenceIds),
  ]);
}

function getSourceReferenceIds(input: BuildMissingActivityObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.sourceReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.sourceReferenceIds),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.sourceReferenceIds),
  ]);
}

function getLineageReferenceIds(input: BuildMissingActivityObservationInput): string[] {
  return uniqueStable([
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getAuditCandidates(input).flatMap((candidate) => candidate.evidence.lineageReferenceIds),
    ...getPackagedAuditArtifacts(input).flatMap((artifact) => artifact.lineageReferenceIds),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.lineageReferenceIds),
  ]);
}

function getAuditContractReferenceIds(input: BuildMissingActivityObservationInput): string[] {
  return uniqueStable([
    input.auditContract?.observationMetadata?.auditObservationId,
    input.auditContract?.findingMetadata?.auditFindingId,
    input.auditContract?.exceptionMetadata?.auditExceptionId,
    input.auditContract?.riskMetadata?.auditRiskId,
    ...(input.auditContract?.evidence.sourceReferenceIds ?? []),
    ...(input.auditContract?.evidence.lineageReferenceIds ?? []),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.auditContractReferenceIds),
  ].filter((value): value is string => value !== undefined));
}

function getAuditCandidateIds(input: BuildMissingActivityObservationInput): string[] {
  return uniqueStable([
    ...getAuditCandidates(input).map((candidate) => candidate.auditCandidateId),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.auditCandidateIds),
  ]);
}

function getAuditEvidencePackageIds(input: BuildMissingActivityObservationInput): string[] {
  return uniqueStable([
    ...getAuditEvidencePackages(input).map((auditEvidencePackage) => auditEvidencePackage.auditEvidencePackageId),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.auditEvidencePackageIds),
  ]);
}

function getAuditFindingArtifactIds(input: BuildMissingActivityObservationInput): string[] {
  return uniqueStable([
    ...getAuditFindings(input).map((auditFinding) => auditFinding.auditFindingArtifactId),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.auditFindingArtifactIds),
  ]);
}

function getAuditFindingIds(input: BuildMissingActivityObservationInput): string[] {
  return uniqueStable([
    ...getAuditFindings(input).map((auditFinding) => auditFinding.auditFindingId),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.auditFindingIds),
  ]);
}

function getAuditConfidenceIds(input: BuildMissingActivityObservationInput): string[] {
  return uniqueStable([
    ...getAuditConfidencePackages(input).map((auditConfidence) => auditConfidence.auditConfidenceId),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.auditConfidenceIds),
  ]);
}

function getAuditSurfaceIds(input: BuildMissingActivityObservationInput): string[] {
  return uniqueStable([
    ...getAuditSurfaces(input).map((auditSurface) => auditSurface.auditSurfaceId),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.auditSurfaceIds),
  ]);
}

function getAuditWatchlistIds(input: BuildMissingActivityObservationInput): string[] {
  return uniqueStable([
    ...getAuditWatchlists(input).map((auditWatchlist) => auditWatchlist.auditWatchlistId),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.auditWatchlistIds),
  ]);
}

function getAuditBriefingIds(input: BuildMissingActivityObservationInput): string[] {
  return uniqueStable([
    ...getAuditBriefings(input).map((auditBriefing) => auditBriefing.auditBriefingId),
    ...getExpectedActivityObservations(input).flatMap((observation) => observation.auditBriefingIds),
  ]);
}

function buildMissingActivityObservationId(input: BuildMissingActivityObservationInput): string {
  return `synthetic-missing-activity-observation:${stableSnapshotHash({
    missingActivityObservationKey: input.missingActivityObservationKey,
    missingActivityCategory: input.missingActivityCategory,
    companyId: input.auditContract?.scope.companyId ?? null,
    auditCategory: input.auditContract ? getAuditCategory(input.auditContract) ?? null : null,
    auditCandidateIds: getAuditCandidateIds(input),
    auditEvidencePackageIds: getAuditEvidencePackageIds(input),
    auditFindingArtifactIds: getAuditFindingArtifactIds(input),
    auditConfidenceIds: getAuditConfidenceIds(input),
    expectedActivityObservationIds: getExpectedActivityObservations(input).map(
      (observation) => observation.expectedActivityObservationId,
    ),
    expectedActivityCategories: getExpectedActivityObservations(input).map(
      (observation) => observation.expectedActivityCategory,
    ),
    recurringPatternObservationIds: uniqueStable(
      getExpectedActivityObservations(input).flatMap((observation) => observation.recurringPatternObservationIds),
    ),
    auditContractReferenceIds: getAuditContractReferenceIds(input),
    auditSurfaceIds: getAuditSurfaceIds(input),
    auditWatchlistIds: getAuditWatchlistIds(input),
    auditBriefingIds: getAuditBriefingIds(input),
    evidenceReferenceIds: getEvidenceReferenceIds(input),
    sourceReferenceIds: getSourceReferenceIds(input),
    lineageReferenceIds: getLineageReferenceIds(input),
    isolationBoundaryIds: input.auditContract?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateArtifacts(input: BuildMissingActivityObservationInput, warnings: string[]): void {
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
        warnings.push(`${artifactName}[${index}].companyId must match auditContract.scope.companyId.`);
      }
    });
  }

  getExpectedActivityObservations(input).forEach((observation, index) => {
    if (!hasValue(observation.expectedActivityObservationId)) {
      warnings.push(`expectedActivityObservations[${index}].expectedActivityObservationId is required.`);
    }
    if (!hasValue(observation.expectedActivityCategory)) {
      warnings.push(`expectedActivityObservations[${index}].expectedActivityCategory is required.`);
    }
    if (!hasValue(observation.companyId)) warnings.push(`expectedActivityObservations[${index}].companyId is required.`);
    if (companyId !== undefined && observation.companyId !== companyId) {
      warnings.push(`expectedActivityObservations[${index}].companyId must match auditContract.scope.companyId.`);
    }
    if (!observation.scope) {
      warnings.push(`expectedActivityObservations[${index}].scope is required.`);
      return;
    }
    if (!hasValue(observation.scope.companyId)) {
      warnings.push(`expectedActivityObservations[${index}].scope.companyId is required.`);
    }
    if (observation.scope.companyId !== observation.companyId) {
      warnings.push(`expectedActivityObservations[${index}].scope.companyId must match companyId.`);
    }
    if (!hasArrayValue(observation.scope.isolationBoundaryIds)) {
      warnings.push(`expectedActivityObservations[${index}].scope.isolationBoundaryIds must include at least one value.`);
    }
    if (!hasArrayValue(observation.evidenceReferenceIds)) {
      warnings.push(`expectedActivityObservations[${index}].evidenceReferenceIds must include at least one value.`);
    }
    if (!hasArrayValue(observation.sourceReferenceIds)) {
      warnings.push(`expectedActivityObservations[${index}].sourceReferenceIds must include at least one value.`);
    }
    if (!hasArrayValue(observation.lineageReferenceIds)) {
      warnings.push(`expectedActivityObservations[${index}].lineageReferenceIds must include at least one value.`);
    }
  });
}

function validateInput(input: BuildMissingActivityObservationInput): string[] {
  const warnings: string[] = [];
  const auditContract = input.auditContract;

  if (!auditContract) {
    warnings.push("auditContract is required.");
    return warnings;
  }

  if (!hasValue(input.missingActivityObservationKey)) warnings.push("missingActivityObservationKey is required.");
  if (!hasValue(input.missingActivityCategory)) warnings.push("missingActivityCategory is required.");
  if (!isSupportedMissingActivityCategory(input.missingActivityCategory)) {
    warnings.push("missingActivityCategory must be a supported missing activity category.");
  }
  if (!auditContract.scope) warnings.push("auditContract.scope is required.");
  if (!auditContract.evidence) warnings.push("auditContract.evidence is required.");
  if (!auditContract.scope || !auditContract.evidence) return warnings;
  if (input.expectedActivityObservations !== undefined && !Array.isArray(input.expectedActivityObservations)) {
    warnings.push("expectedActivityObservations must be an array.");
  }

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

export function buildMissingActivityObservation(
  input: BuildMissingActivityObservationInput,
): BuildMissingActivityObservationResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.auditContract) {
    return {
      missingActivityObservation: null,
      skipped: true,
      warnings,
    };
  }

  const auditContract = input.auditContract;
  const auditCandidates = getAuditCandidates(input);
  const auditEvidencePackages = getAuditEvidencePackages(input);
  const auditFindings = getAuditFindings(input);
  const auditConfidencePackages = getAuditConfidencePackages(input);
  const expectedActivityObservations = getExpectedActivityObservations(input);
  const auditSurfaces = getAuditSurfaces(input);
  const auditWatchlists = getAuditWatchlists(input);
  const auditBriefings = getAuditBriefings(input);
  const allArtifacts = getAllAuditArtifacts(input);

  return {
    missingActivityObservation: {
      missingActivityObservationId: buildMissingActivityObservationId(input),
      missingActivityObservationKey: input.missingActivityObservationKey,
      missingActivityCategory: input.missingActivityCategory,
      companyId: auditContract.scope.companyId,
      auditCategory: getAuditCategory(auditContract),
      scope: auditContract.scope,
      auditCandidateIds: getAuditCandidateIds(input),
      auditEvidencePackageIds: getAuditEvidencePackageIds(input),
      auditFindingArtifactIds: getAuditFindingArtifactIds(input),
      auditFindingIds: getAuditFindingIds(input),
      auditConfidenceIds: getAuditConfidenceIds(input),
      expectedActivityObservationIds: expectedActivityObservations.map(
        (observation) => observation.expectedActivityObservationId,
      ),
      expectedActivityCategories: expectedActivityObservations.map((observation) => observation.expectedActivityCategory),
      recurringPatternObservationIds: uniqueStable(
        expectedActivityObservations.flatMap((observation) => observation.recurringPatternObservationIds),
      ),
      recurringPatternObservationKeys: uniqueStable(
        expectedActivityObservations.flatMap((observation) => observation.recurringPatternObservationKeys),
      ),
      recurringPatternCategories: uniqueStable(
        expectedActivityObservations.flatMap((observation) => observation.recurringPatternCategories),
      ),
      auditContractReferenceIds: getAuditContractReferenceIds(input),
      auditSurfaceIds: getAuditSurfaceIds(input),
      auditWatchlistIds: getAuditWatchlistIds(input),
      auditBriefingIds: getAuditBriefingIds(input),
      evidence: auditContract.evidence,
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      sourceReferenceIds: getSourceReferenceIds(input),
      lineageReferenceIds: getLineageReferenceIds(input),
      observationMetadata: compactDefined([
        auditContract.observationMetadata,
        ...allArtifacts.map((artifact) => artifact.observationMetadata),
        ...expectedActivityObservations.flatMap((observation) => observation.observationMetadata),
      ]),
      findingMetadata: compactDefined([
        auditContract.findingMetadata,
        ...allArtifacts.map((artifact) => artifact.findingMetadata),
        ...expectedActivityObservations.flatMap((observation) => observation.findingMetadata),
      ]),
      exceptionMetadata: compactDefined([
        auditContract.exceptionMetadata,
        ...allArtifacts.map((artifact) => artifact.exceptionMetadata),
        ...expectedActivityObservations.flatMap((observation) => observation.exceptionMetadata),
      ]),
      riskMetadata: compactDefined([
        auditContract.riskMetadata,
        ...allArtifacts.map((artifact) => artifact.riskMetadata),
        ...expectedActivityObservations.flatMap((observation) => observation.riskMetadata),
      ]),
      trustMetadata: compactDefined([
        auditContract.trustMetadata,
        ...allArtifacts.map((artifact) => artifact.trustMetadata),
        ...expectedActivityObservations.flatMap((observation) => observation.trustMetadata),
      ]),
      confidenceMetadata: compactDefined([
        auditContract.confidenceMetadata,
        ...allArtifacts.map((artifact) => artifact.confidenceMetadata),
        ...expectedActivityObservations.flatMap((observation) => observation.confidenceMetadata),
      ]),
      governanceMetadata: compactDefined([
        auditContract.governanceMetadata,
        ...allArtifacts.map((artifact) => artifact.governanceMetadata),
        ...expectedActivityObservations.flatMap((observation) => observation.governanceMetadata),
      ]),
      materialityCompatibility: compactDefined([
        auditContract.materialityCompatibility,
        ...allArtifacts.map((artifact) => artifact.materialityCompatibility),
        ...expectedActivityObservations.flatMap((observation) => observation.materialityCompatibility),
      ]),
      personaCompatibility: compactDefined([
        auditContract.personaCompatibility,
        ...allArtifacts.map((artifact) => artifact.personaCompatibility),
        ...expectedActivityObservations.flatMap((observation) => observation.personaCompatibility),
      ]),
      packageCompatibility: compactDefined([
        auditContract.packageCompatibility,
        ...allArtifacts.map((artifact) => artifact.packageCompatibility),
        ...expectedActivityObservations.flatMap((observation) => observation.packageCompatibility),
      ]),
      memoryCompatibility: compactDefined([
        auditContract.memoryCompatibility,
        ...allArtifacts.map((artifact) => artifact.memoryCompatibility),
        ...expectedActivityObservations.flatMap((observation) => observation.memoryCompatibility),
      ]),
      learningCompatibility: compactDefined([
        auditContract.learningCompatibility,
        ...allArtifacts.map((artifact) => artifact.learningCompatibility),
        ...expectedActivityObservations.flatMap((observation) => observation.learningCompatibility),
      ]),
      surfaceCompatibility: compactDefined([
        auditContract.surfaceCompatibility,
        ...allArtifacts.map((artifact) => artifact.surfaceCompatibility),
        ...expectedActivityObservations.flatMap((observation) => observation.surfaceCompatibility),
      ]),
      auditContract,
      auditCandidates,
      auditEvidencePackages,
      auditFindings,
      auditConfidencePackages,
      expectedActivityObservations,
      auditSurfaces,
      auditWatchlists,
      auditBriefings,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
