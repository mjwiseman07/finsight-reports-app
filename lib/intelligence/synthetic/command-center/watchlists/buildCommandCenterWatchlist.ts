import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticStructuredCommandCenterSurfaceCandidate } from "../surface-candidates";
import type {
  SyntheticCommandCenterAttentionMetadata,
  SyntheticCommandCenterConfidenceMetadata,
  SyntheticCommandCenterDegradationMetadata,
  SyntheticCommandCenterGovernanceMetadata,
  SyntheticCommandCenterRecoveryMetadata,
  SyntheticCommandCenterRoleCategory,
  SyntheticCommandCenterRoleVisibilityDescriptor,
  SyntheticCommandCenterTrustMetadata,
  SyntheticCommandCenterWatchlistCompatibility,
} from "../types";

export type SyntheticCommandCenterWatchlistCategory =
  | "cash_watchlist"
  | "forecast_watchlist"
  | "scenario_watchlist"
  | "customer_watchlist"
  | "vendor_watchlist"
  | "workforce_watchlist"
  | "close_watchlist"
  | "portfolio_watchlist"
  | "reconciliation_watchlist"
  | "risk_watchlist";

export interface SyntheticCommandCenterWatchlistCapacity {
  primaryWatchlistChangeLimit: number;
  executiveSummaryWatchlistChangeLimit: number;
  portfolioWatchlistChangeLimit: number;
}

export interface BuildCommandCenterWatchlistInput {
  companyId: string;
  watchlistKey: string;
  watchlistCategory: SyntheticCommandCenterWatchlistCategory;
  surfaceCandidates: SyntheticStructuredCommandCenterSurfaceCandidate[];
}

export interface SyntheticCommandCenterWatchlist {
  watchlistId: string;
  companyId: string;
  watchlistKey: string;
  watchlistCategory: SyntheticCommandCenterWatchlistCategory;
  capacity: SyntheticCommandCenterWatchlistCapacity;
  surfaceCandidates: SyntheticStructuredCommandCenterSurfaceCandidate[];
  surfaceCandidateIds: string[];
  prioritizationPackageIds: string[];
  evidencePackageIds: string[];
  commandCenterCandidateIds: string[];
  evidenceReferenceIds: string[];
  trustMetadata: SyntheticCommandCenterTrustMetadata[];
  trustReferenceIds: string[];
  confidenceMetadata: SyntheticCommandCenterConfidenceMetadata[];
  confidenceReferenceIds: string[];
  degradationMetadata: SyntheticCommandCenterDegradationMetadata[];
  degradationReferenceIds: string[];
  recoveryMetadata: SyntheticCommandCenterRecoveryMetadata[];
  recoveryReferenceIds: string[];
  governanceMetadata: SyntheticCommandCenterGovernanceMetadata[];
  governanceReferenceIds: string[];
  memoryReferenceIds: string[];
  outcomeReferenceIds: string[];
  whyNowReferenceIds: string[];
  attentionMetadata: SyntheticCommandCenterAttentionMetadata[];
  attentionReferenceIds: string[];
  watchlistCompatibilityMetadata: SyntheticCommandCenterWatchlistCompatibility[];
  watchlistReferenceIds: string[];
  roleVisibilityDescriptors: SyntheticCommandCenterRoleVisibilityDescriptor[];
  roleVisibilityCategories: SyntheticCommandCenterRoleCategory[];
  roleVisibilityReferenceIds: string[];
  warnings: string[];
}

export interface BuildCommandCenterWatchlistResult {
  watchlist: SyntheticCommandCenterWatchlist | null;
  skipped: boolean;
  warnings: string[];
}

const WATCHLIST_CATEGORIES: SyntheticCommandCenterWatchlistCategory[] = [
  "cash_watchlist",
  "forecast_watchlist",
  "scenario_watchlist",
  "customer_watchlist",
  "vendor_watchlist",
  "workforce_watchlist",
  "close_watchlist",
  "portfolio_watchlist",
  "reconciliation_watchlist",
  "risk_watchlist",
];

export const SYNTHETIC_COMMAND_CENTER_WATCHLIST_CAPACITY: SyntheticCommandCenterWatchlistCapacity = {
  primaryWatchlistChangeLimit: 5,
  executiveSummaryWatchlistChangeLimit: 5,
  portfolioWatchlistChangeLimit: 10,
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function compactDefined<T>(values: Array<T | undefined>): T[] {
  return values.filter((value): value is T => value !== undefined);
}

function buildWatchlistId(input: BuildCommandCenterWatchlistInput): string {
  return `command-center-watchlist:${stableSnapshotHash({
    companyId: input.companyId,
    watchlistKey: input.watchlistKey,
    watchlistCategory: input.watchlistCategory,
    surfaceCandidateIds: input.surfaceCandidates.map((candidate) => candidate.surfaceCandidateId),
    prioritizationPackageIds: input.surfaceCandidates.map((candidate) => candidate.prioritizationPackageId),
    evidencePackageIds: input.surfaceCandidates.map((candidate) => candidate.evidencePackageId),
    commandCenterCandidateIds: input.surfaceCandidates.map((candidate) => candidate.commandCenterCandidateId),
  })}`;
}

function getEvidenceReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(candidates.flatMap((candidate) => candidate.prioritizationPackage.evidencePackage.evidence.evidenceIds));
}

function getTrustReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap((candidate) => candidate.prioritizationPackage.evidencePackage.trustMetadata?.trustEvidenceIds ?? []),
  );
}

function getConfidenceReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap(
      (candidate) => candidate.prioritizationPackage.evidencePackage.confidenceMetadata?.confidenceEvidenceIds ?? [],
    ),
  );
}

function getDegradationReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap(
      (candidate) => candidate.prioritizationPackage.evidencePackage.degradationMetadata?.degradationEvidenceIds ?? [],
    ),
  );
}

function getRecoveryReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap((candidate) => candidate.prioritizationPackage.evidencePackage.recoveryMetadata?.recoveryEvidenceIds ?? []),
  );
}

function getGovernanceReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap(
      (candidate) => candidate.prioritizationPackage.evidencePackage.governanceMetadata?.governanceBoundaryIds ?? [],
    ),
  );
}

function getAttentionReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap((candidate) => candidate.prioritizationPackage.attentionMetadata?.attentionEvidenceIds ?? []),
  );
}

function getWatchlistReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap((candidate) => {
      const compatibility = candidate.prioritizationPackage.watchlistCompatibility;
      return [...(compatibility?.watchlistSourceReferenceIds ?? []), ...(compatibility?.watchlistEvidenceIds ?? [])];
    }),
  );
}

function getRoleVisibilityCategories(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): SyntheticCommandCenterRoleCategory[] {
  return [
    ...new Set(
      candidates.flatMap((candidate) => [
        ...candidate.visibleRoleCategories,
        ...(candidate.prioritizationPackage.roleVisibilityDescriptor?.visibleRoleCategories ?? []),
        ...(candidate.prioritizationPackage.watchlistCompatibility?.watchlistRoleCategories ?? []),
      ]),
    ),
  ];
}

function getRoleVisibilityReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap((candidate) => {
      const descriptor = candidate.prioritizationPackage.roleVisibilityDescriptor;
      return [...(descriptor?.visibilitySourceReferenceIds ?? []), ...(descriptor?.visibilityEvidenceIds ?? [])];
    }),
  );
}

function countPrimaryWatchlistChanges(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): number {
  return candidates.filter((candidate) => candidate.surfacePlacement === "primary_surface").length;
}

function countExecutiveSummaryWatchlistChanges(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): number {
  return candidates.filter((candidate) => candidate.consumptionChannels.includes("executive_summary")).length;
}

function countPortfolioWatchlistChanges(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): number {
  return candidates.filter((candidate) => candidate.surfaceArtifactCategory === "portfolio_item").length;
}

function validateInput(input: BuildCommandCenterWatchlistInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!hasValue(input.watchlistKey)) warnings.push("watchlistKey is required.");
  if (!WATCHLIST_CATEGORIES.includes(input.watchlistCategory)) {
    warnings.push("watchlistCategory is not supported.");
  }
  if (!Array.isArray(input.surfaceCandidates)) {
    warnings.push("surfaceCandidates must be an array.");
    return warnings;
  }
  if (input.surfaceCandidates.length === 0) {
    warnings.push("surfaceCandidates must include at least one candidate.");
  }
  if (countPrimaryWatchlistChanges(input.surfaceCandidates) > SYNTHETIC_COMMAND_CENTER_WATCHLIST_CAPACITY.primaryWatchlistChangeLimit) {
    warnings.push("primary watchlist changes exceed the approved capacity.");
  }
  if (
    countExecutiveSummaryWatchlistChanges(input.surfaceCandidates) >
    SYNTHETIC_COMMAND_CENTER_WATCHLIST_CAPACITY.executiveSummaryWatchlistChangeLimit
  ) {
    warnings.push("executive summary watchlist changes exceed the approved capacity.");
  }
  if (countPortfolioWatchlistChanges(input.surfaceCandidates) > SYNTHETIC_COMMAND_CENTER_WATCHLIST_CAPACITY.portfolioWatchlistChangeLimit) {
    warnings.push("portfolio watchlist changes exceed the approved capacity.");
  }

  for (const candidate of input.surfaceCandidates) {
    if (!hasValue(candidate.surfaceCandidateId)) warnings.push("surfaceCandidateId is required.");
    if (!hasValue(candidate.prioritizationPackageId)) warnings.push("prioritizationPackageId is required.");
    if (!hasValue(candidate.evidencePackageId)) warnings.push("evidencePackageId is required.");
    if (!hasValue(candidate.commandCenterCandidateId)) warnings.push("commandCenterCandidateId is required.");
    if (candidate.companyId !== input.companyId) {
      warnings.push("surface candidate companyId must match input companyId.");
    }
    if (!candidate.prioritizationPackage?.watchlistCompatibility) {
      warnings.push("watchlistCompatibility is required.");
    }
    if (candidate.prioritizationPackage?.watchlistCompatibility?.watchlistCompatible === false) {
      warnings.push("watchlistCompatibility.watchlistCompatible must be true.");
    }
  }

  return warnings;
}

export function buildCommandCenterWatchlist(input: BuildCommandCenterWatchlistInput): BuildCommandCenterWatchlistResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      watchlist: null,
      skipped: true,
      warnings,
    };
  }

  return {
    watchlist: {
      watchlistId: buildWatchlistId(input),
      companyId: input.companyId,
      watchlistKey: input.watchlistKey,
      watchlistCategory: input.watchlistCategory,
      capacity: SYNTHETIC_COMMAND_CENTER_WATCHLIST_CAPACITY,
      surfaceCandidates: input.surfaceCandidates,
      surfaceCandidateIds: input.surfaceCandidates.map((candidate) => candidate.surfaceCandidateId),
      prioritizationPackageIds: input.surfaceCandidates.map((candidate) => candidate.prioritizationPackageId),
      evidencePackageIds: input.surfaceCandidates.map((candidate) => candidate.evidencePackageId),
      commandCenterCandidateIds: input.surfaceCandidates.map((candidate) => candidate.commandCenterCandidateId),
      evidenceReferenceIds: getEvidenceReferenceIds(input.surfaceCandidates),
      trustMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.evidencePackage.trustMetadata),
      ),
      trustReferenceIds: getTrustReferenceIds(input.surfaceCandidates),
      confidenceMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.evidencePackage.confidenceMetadata),
      ),
      confidenceReferenceIds: getConfidenceReferenceIds(input.surfaceCandidates),
      degradationMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.evidencePackage.degradationMetadata),
      ),
      degradationReferenceIds: getDegradationReferenceIds(input.surfaceCandidates),
      recoveryMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.evidencePackage.recoveryMetadata),
      ),
      recoveryReferenceIds: getRecoveryReferenceIds(input.surfaceCandidates),
      governanceMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.evidencePackage.governanceMetadata),
      ),
      governanceReferenceIds: getGovernanceReferenceIds(input.surfaceCandidates),
      memoryReferenceIds: uniqueStable(input.surfaceCandidates.flatMap((candidate) => candidate.memoryReferenceIds)),
      outcomeReferenceIds: uniqueStable(input.surfaceCandidates.flatMap((candidate) => candidate.outcomeReferenceIds)),
      whyNowReferenceIds: uniqueStable(input.surfaceCandidates.flatMap((candidate) => candidate.whyNowReasons)),
      attentionMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.attentionMetadata),
      ),
      attentionReferenceIds: getAttentionReferenceIds(input.surfaceCandidates),
      watchlistCompatibilityMetadata: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.watchlistCompatibility),
      ),
      watchlistReferenceIds: getWatchlistReferenceIds(input.surfaceCandidates),
      roleVisibilityDescriptors: compactDefined(
        input.surfaceCandidates.map((candidate) => candidate.prioritizationPackage.roleVisibilityDescriptor),
      ),
      roleVisibilityCategories: getRoleVisibilityCategories(input.surfaceCandidates),
      roleVisibilityReferenceIds: getRoleVisibilityReferenceIds(input.surfaceCandidates),
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
