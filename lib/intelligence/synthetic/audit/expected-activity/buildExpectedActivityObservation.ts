import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticAuditBriefing } from "../briefings";
import type { SyntheticAuditCandidate } from "../candidates";
import type { SyntheticAuditConfidence } from "../confidence";
import type { SyntheticAuditEvidencePackage } from "../evidence";
import type { SyntheticAuditFinding } from "../findings";
import type { SyntheticRecurringPatternObservation } from "../recurring-patterns";
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

export type SyntheticExpectedActivityCategory =
  | "expected_vendor_invoice"
  | "expected_utility_expense"
  | "expected_payroll_activity"
  | "expected_journal_entry"
  | "expected_depreciation_entry"
  | "expected_amortization_entry"
  | "expected_tax_remittance"
  | "expected_lease_payment"
  | "expected_debt_payment"
  | "expected_customer_billing"
  | "expected_inventory_adjustment"
  | "expected_reserve_update"
  | "expected_reconciliation_activity";

export const SYNTHETIC_EXPECTED_ACTIVITY_CATEGORIES: SyntheticExpectedActivityCategory[] = [
  "expected_vendor_invoice",
  "expected_utility_expense",
  "expected_payroll_activity",
  "expected_journal_entry",
  "expected_depreciation_entry",
  "expected_amortization_entry",
  "expected_tax_remittance",
  "expected_lease_payment",
  "expected_debt_payment",
  "expected_customer_billing",
  "expected_inventory_adjustment",
  "expected_reserve_update",
  "expected_reconciliation_activity",
];

export interface BuildExpectedActivityObservationInput {
  recurringPatternObservations: SyntheticRecurringPatternObservation[];
  expectedActivityObservationKey: string;
  expectedActivityCategory: SyntheticExpectedActivityCategory;
}

export interface SyntheticExpectedActivityObservation {
  expectedActivityObservationId: string;
  expectedActivityObservationKey: string;
  expectedActivityCategory: SyntheticExpectedActivityCategory;
  companyId: string;
  auditCategories: SyntheticAuditCategory[];
  scope: SyntheticAuditScope;
  recurringPatternObservationIds: string[];
  recurringPatternObservationKeys: string[];
  recurringPatternCategories: string[];
  auditContractReferenceIds: string[];
  auditCandidateIds: string[];
  auditEvidencePackageIds: string[];
  auditFindingArtifactIds: string[];
  auditFindingIds: string[];
  auditConfidenceIds: string[];
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
  auditCandidates: SyntheticAuditCandidate[];
  auditEvidencePackages: SyntheticAuditEvidencePackage[];
  auditFindings: SyntheticAuditFinding[];
  auditConfidencePackages: SyntheticAuditConfidence[];
  auditSurfaces: SyntheticAuditSurface[];
  auditWatchlists: SyntheticAuditWatchlist[];
  auditBriefings: SyntheticAuditBriefing[];
  recurringPatternObservations: SyntheticRecurringPatternObservation[];
  warnings: string[];
}

export interface BuildExpectedActivityObservationResult {
  expectedActivityObservation: SyntheticExpectedActivityObservation | null;
  skipped: boolean;
  warnings: string[];
}

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

function isSupportedExpectedActivityCategory(category: SyntheticExpectedActivityCategory): boolean {
  return SYNTHETIC_EXPECTED_ACTIVITY_CATEGORIES.includes(category);
}

function getRecurringPatternObservations(
  input: BuildExpectedActivityObservationInput,
): SyntheticRecurringPatternObservation[] {
  return input.recurringPatternObservations ?? [];
}

function getFirstRecurringPatternObservation(
  input: BuildExpectedActivityObservationInput,
): SyntheticRecurringPatternObservation | undefined {
  return getRecurringPatternObservations(input)[0];
}

function buildExpectedActivityObservationId(input: BuildExpectedActivityObservationInput): string {
  return `synthetic-expected-activity-observation:${stableSnapshotHash({
    expectedActivityObservationKey: input.expectedActivityObservationKey,
    expectedActivityCategory: input.expectedActivityCategory,
    companyId: getFirstRecurringPatternObservation(input)?.companyId ?? null,
    recurringPatternObservationIds: getRecurringPatternObservations(input).map(
      (observation) => observation.recurringPatternObservationId,
    ),
    recurringPatternCategories: getRecurringPatternObservations(input).map(
      (observation) => observation.recurringPatternCategory,
    ),
    auditContractReferenceIds: uniqueStable(
      getRecurringPatternObservations(input).flatMap((observation) => observation.auditContractReferenceIds),
    ),
    auditCandidateIds: uniqueStable(
      getRecurringPatternObservations(input).flatMap((observation) => observation.auditCandidateIds),
    ),
    auditEvidencePackageIds: uniqueStable(
      getRecurringPatternObservations(input).flatMap((observation) => observation.auditEvidencePackageIds),
    ),
    auditFindingArtifactIds: uniqueStable(
      getRecurringPatternObservations(input).flatMap((observation) => observation.auditFindingArtifactIds),
    ),
    auditConfidenceIds: uniqueStable(
      getRecurringPatternObservations(input).flatMap((observation) => observation.auditConfidenceIds),
    ),
    auditSurfaceIds: uniqueStable(
      getRecurringPatternObservations(input).flatMap((observation) => observation.auditSurfaceIds),
    ),
    auditWatchlistIds: uniqueStable(
      getRecurringPatternObservations(input).flatMap((observation) => observation.auditWatchlistIds),
    ),
    auditBriefingIds: uniqueStable(
      getRecurringPatternObservations(input).flatMap((observation) => observation.auditBriefingIds),
    ),
    evidenceReferenceIds: uniqueStable(
      getRecurringPatternObservations(input).flatMap((observation) => observation.evidenceReferenceIds),
    ),
    sourceReferenceIds: uniqueStable(
      getRecurringPatternObservations(input).flatMap((observation) => observation.sourceReferenceIds),
    ),
    lineageReferenceIds: uniqueStable(
      getRecurringPatternObservations(input).flatMap((observation) => observation.lineageReferenceIds),
    ),
    isolationBoundaryIds: getFirstRecurringPatternObservation(input)?.scope.isolationBoundaryIds ?? [],
  })}`;
}

function validateInput(input: BuildExpectedActivityObservationInput): string[] {
  const warnings: string[] = [];
  const recurringPatternObservations = getRecurringPatternObservations(input);
  const firstObservation = getFirstRecurringPatternObservation(input);

  if (!hasValue(input.expectedActivityObservationKey)) warnings.push("expectedActivityObservationKey is required.");
  if (!hasValue(input.expectedActivityCategory)) warnings.push("expectedActivityCategory is required.");
  if (!isSupportedExpectedActivityCategory(input.expectedActivityCategory)) {
    warnings.push("expectedActivityCategory must be a supported expected activity category.");
  }
  if (!Array.isArray(input.recurringPatternObservations)) {
    warnings.push("recurringPatternObservations must be an array.");
    return warnings;
  }
  if (recurringPatternObservations.length === 0) {
    warnings.push("recurringPatternObservations must include at least one value.");
    return warnings;
  }
  if (!firstObservation) return warnings;

  recurringPatternObservations.forEach((observation, index) => {
    if (!hasValue(observation.recurringPatternObservationId)) {
      warnings.push(`recurringPatternObservations[${index}].recurringPatternObservationId is required.`);
    }
    if (!hasValue(observation.recurringPatternObservationKey)) {
      warnings.push(`recurringPatternObservations[${index}].recurringPatternObservationKey is required.`);
    }
    if (!hasValue(observation.recurringPatternCategory)) {
      warnings.push(`recurringPatternObservations[${index}].recurringPatternCategory is required.`);
    }
    if (!hasValue(observation.companyId)) warnings.push(`recurringPatternObservations[${index}].companyId is required.`);
    if (observation.companyId !== firstObservation.companyId) {
      warnings.push(`recurringPatternObservations[${index}].companyId must match the first recurring pattern companyId.`);
    }
    if (!observation.scope) {
      warnings.push(`recurringPatternObservations[${index}].scope is required.`);
      return;
    }
    if (!hasValue(observation.scope.companyId)) {
      warnings.push(`recurringPatternObservations[${index}].scope.companyId is required.`);
    }
    if (observation.scope.companyId !== observation.companyId) {
      warnings.push(`recurringPatternObservations[${index}].scope.companyId must match companyId.`);
    }
    if (!hasArrayValue(observation.scope.isolationBoundaryIds)) {
      warnings.push(`recurringPatternObservations[${index}].scope.isolationBoundaryIds must include at least one value.`);
    }
    if (!hasArrayValue(observation.evidenceReferenceIds)) {
      warnings.push(`recurringPatternObservations[${index}].evidenceReferenceIds must include at least one value.`);
    }
    if (!hasArrayValue(observation.sourceReferenceIds)) {
      warnings.push(`recurringPatternObservations[${index}].sourceReferenceIds must include at least one value.`);
    }
    if (!hasArrayValue(observation.lineageReferenceIds)) {
      warnings.push(`recurringPatternObservations[${index}].lineageReferenceIds must include at least one value.`);
    }
  });

  return warnings;
}

export function buildExpectedActivityObservation(
  input: BuildExpectedActivityObservationInput,
): BuildExpectedActivityObservationResult {
  const warnings = validateInput(input);
  const firstObservation = getFirstRecurringPatternObservation(input);
  if (warnings.length > 0 || !firstObservation) {
    return {
      expectedActivityObservation: null,
      skipped: true,
      warnings,
    };
  }

  const recurringPatternObservations = getRecurringPatternObservations(input);

  return {
    expectedActivityObservation: {
      expectedActivityObservationId: buildExpectedActivityObservationId(input),
      expectedActivityObservationKey: input.expectedActivityObservationKey,
      expectedActivityCategory: input.expectedActivityCategory,
      companyId: firstObservation.companyId,
      auditCategories: compactDefined(recurringPatternObservations.map((observation) => observation.auditCategory)),
      scope: firstObservation.scope,
      recurringPatternObservationIds: recurringPatternObservations.map(
        (observation) => observation.recurringPatternObservationId,
      ),
      recurringPatternObservationKeys: recurringPatternObservations.map(
        (observation) => observation.recurringPatternObservationKey,
      ),
      recurringPatternCategories: recurringPatternObservations.map((observation) => observation.recurringPatternCategory),
      auditContractReferenceIds: uniqueStable(
        recurringPatternObservations.flatMap((observation) => observation.auditContractReferenceIds),
      ),
      auditCandidateIds: uniqueStable(recurringPatternObservations.flatMap((observation) => observation.auditCandidateIds)),
      auditEvidencePackageIds: uniqueStable(
        recurringPatternObservations.flatMap((observation) => observation.auditEvidencePackageIds),
      ),
      auditFindingArtifactIds: uniqueStable(
        recurringPatternObservations.flatMap((observation) => observation.auditFindingArtifactIds),
      ),
      auditFindingIds: uniqueStable(recurringPatternObservations.flatMap((observation) => observation.auditFindingIds)),
      auditConfidenceIds: uniqueStable(
        recurringPatternObservations.flatMap((observation) => observation.auditConfidenceIds),
      ),
      auditSurfaceIds: uniqueStable(recurringPatternObservations.flatMap((observation) => observation.auditSurfaceIds)),
      auditWatchlistIds: uniqueStable(
        recurringPatternObservations.flatMap((observation) => observation.auditWatchlistIds),
      ),
      auditBriefingIds: uniqueStable(recurringPatternObservations.flatMap((observation) => observation.auditBriefingIds)),
      evidence: recurringPatternObservations.map((observation) => observation.evidence),
      evidenceReferenceIds: uniqueStable(
        recurringPatternObservations.flatMap((observation) => observation.evidenceReferenceIds),
      ),
      sourceReferenceIds: uniqueStable(
        recurringPatternObservations.flatMap((observation) => observation.sourceReferenceIds),
      ),
      lineageReferenceIds: uniqueStable(
        recurringPatternObservations.flatMap((observation) => observation.lineageReferenceIds),
      ),
      observationMetadata: recurringPatternObservations.flatMap((observation) => observation.observationMetadata),
      findingMetadata: recurringPatternObservations.flatMap((observation) => observation.findingMetadata),
      exceptionMetadata: recurringPatternObservations.flatMap((observation) => observation.exceptionMetadata),
      riskMetadata: recurringPatternObservations.flatMap((observation) => observation.riskMetadata),
      trustMetadata: recurringPatternObservations.flatMap((observation) => observation.trustMetadata),
      confidenceMetadata: recurringPatternObservations.flatMap((observation) => observation.confidenceMetadata),
      governanceMetadata: recurringPatternObservations.flatMap((observation) => observation.governanceMetadata),
      materialityCompatibility: recurringPatternObservations.flatMap(
        (observation) => observation.materialityCompatibility,
      ),
      personaCompatibility: recurringPatternObservations.flatMap((observation) => observation.personaCompatibility),
      packageCompatibility: recurringPatternObservations.flatMap((observation) => observation.packageCompatibility),
      memoryCompatibility: recurringPatternObservations.flatMap((observation) => observation.memoryCompatibility),
      learningCompatibility: recurringPatternObservations.flatMap((observation) => observation.learningCompatibility),
      surfaceCompatibility: recurringPatternObservations.flatMap((observation) => observation.surfaceCompatibility),
      auditContracts: recurringPatternObservations.map((observation) => observation.auditContract),
      auditCandidates: recurringPatternObservations.flatMap((observation) => observation.auditCandidates),
      auditEvidencePackages: recurringPatternObservations.flatMap((observation) => observation.auditEvidencePackages),
      auditFindings: recurringPatternObservations.flatMap((observation) => observation.auditFindings),
      auditConfidencePackages: recurringPatternObservations.flatMap((observation) => observation.auditConfidencePackages),
      auditSurfaces: recurringPatternObservations.flatMap((observation) => observation.auditSurfaces),
      auditWatchlists: recurringPatternObservations.flatMap((observation) => observation.auditWatchlists),
      auditBriefings: recurringPatternObservations.flatMap((observation) => observation.auditBriefings),
      recurringPatternObservations,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
