import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticCommandCenterDecisionQueue } from "../decision-queues";
import type { SyntheticCommandCenterExecutiveSummary } from "../summaries";
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
} from "../types";
import type { SyntheticCommandCenterWatchlist } from "../watchlists";

export type SyntheticCommandCenterBriefingType =
  | "daily_cfo_brief"
  | "weekly_executive_brief"
  | "monthly_board_brief"
  | "weekly_controller_brief"
  | "daily_cash_brief"
  | "portfolio_brief"
  | "firm_manager_brief"
  | "client_owner_brief"
  | "close_readiness_brief"
  | "reconciliation_exception_brief";

export type SyntheticCommandCenterBriefingCadence =
  | "disabled"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "event_driven"
  | "threshold_driven"
  | "manual_request";

export type SyntheticCommandCenterBriefingConsumptionSection =
  | "health"
  | "attention"
  | "decisions"
  | "risks"
  | "opportunities"
  | "why_now"
  | "memory"
  | "outcomes"
  | "evidence";

export interface SyntheticCommandCenterBriefingCadenceMetadata {
  cadence: SyntheticCommandCenterBriefingCadence;
}

export interface SyntheticCommandCenterBriefingIsolationMetadata {
  companyId: string;
  customerIsolationReferenceIds: string[];
  firmIsolationReferenceIds: string[];
  clientIsolationReferenceIds: string[];
}

export interface BuildCommandCenterBriefingInput {
  companyId: string;
  briefingKey: string;
  briefingType: SyntheticCommandCenterBriefingType;
  cadenceMetadata: SyntheticCommandCenterBriefingCadenceMetadata;
  executiveSummaries?: SyntheticCommandCenterExecutiveSummary[];
  decisionQueues?: SyntheticCommandCenterDecisionQueue[];
  watchlists?: SyntheticCommandCenterWatchlist[];
  surfaceCandidates?: SyntheticStructuredCommandCenterSurfaceCandidate[];
  isolationMetadata?: Omit<SyntheticCommandCenterBriefingIsolationMetadata, "companyId">;
}

export interface SyntheticCommandCenterBriefing {
  briefingId: string;
  companyId: string;
  briefingKey: string;
  briefingType: SyntheticCommandCenterBriefingType;
  cadenceMetadata: SyntheticCommandCenterBriefingCadenceMetadata;
  consumptionSectionOrder: SyntheticCommandCenterBriefingConsumptionSection[];
  executiveSummaries: SyntheticCommandCenterExecutiveSummary[];
  decisionQueues: SyntheticCommandCenterDecisionQueue[];
  watchlists: SyntheticCommandCenterWatchlist[];
  surfaceCandidates: SyntheticStructuredCommandCenterSurfaceCandidate[];
  executiveSummaryIds: string[];
  decisionQueueIds: string[];
  watchlistIds: string[];
  surfaceCandidateIds: string[];
  healthReferenceIds: string[];
  attentionReferenceIds: string[];
  decisionReferenceIds: string[];
  riskReferenceIds: string[];
  opportunityReferenceIds: string[];
  whyNowReferenceIds: string[];
  memoryReferenceIds: string[];
  outcomeReferenceIds: string[];
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
  roleVisibilityDescriptors: SyntheticCommandCenterRoleVisibilityDescriptor[];
  roleVisibilityCategories: SyntheticCommandCenterRoleCategory[];
  roleVisibilityReferenceIds: string[];
  isolationMetadata: SyntheticCommandCenterBriefingIsolationMetadata;
  warnings: string[];
}

export interface BuildCommandCenterBriefingResult {
  briefing: SyntheticCommandCenterBriefing | null;
  skipped: boolean;
  warnings: string[];
}

const BRIEFING_TYPES: SyntheticCommandCenterBriefingType[] = [
  "daily_cfo_brief",
  "weekly_executive_brief",
  "monthly_board_brief",
  "weekly_controller_brief",
  "daily_cash_brief",
  "portfolio_brief",
  "firm_manager_brief",
  "client_owner_brief",
  "close_readiness_brief",
  "reconciliation_exception_brief",
];

const BRIEFING_CADENCES: SyntheticCommandCenterBriefingCadence[] = [
  "disabled",
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "event_driven",
  "threshold_driven",
  "manual_request",
];

export const SYNTHETIC_COMMAND_CENTER_BRIEFING_CONSUMPTION_SECTION_ORDER: SyntheticCommandCenterBriefingConsumptionSection[] = [
  "health",
  "attention",
  "decisions",
  "risks",
  "opportunities",
  "why_now",
  "memory",
  "outcomes",
  "evidence",
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function compactDefined<T>(values: Array<T | undefined>): T[] {
  return values.filter((value): value is T => value !== undefined);
}

function getExecutiveSummaries(input: BuildCommandCenterBriefingInput): SyntheticCommandCenterExecutiveSummary[] {
  return input.executiveSummaries ?? [];
}

function getDecisionQueues(input: BuildCommandCenterBriefingInput): SyntheticCommandCenterDecisionQueue[] {
  return input.decisionQueues ?? [];
}

function getWatchlists(input: BuildCommandCenterBriefingInput): SyntheticCommandCenterWatchlist[] {
  return input.watchlists ?? [];
}

function getSurfaceCandidates(input: BuildCommandCenterBriefingInput): SyntheticStructuredCommandCenterSurfaceCandidate[] {
  return input.surfaceCandidates ?? [];
}

function buildBriefingId(input: BuildCommandCenterBriefingInput): string {
  return `command-center-briefing:${stableSnapshotHash({
    companyId: input.companyId,
    briefingKey: input.briefingKey,
    briefingType: input.briefingType,
    cadence: input.cadenceMetadata?.cadence ?? null,
    executiveSummaryIds: getExecutiveSummaries(input).map((summary) => summary.executiveSummaryId),
    decisionQueueIds: getDecisionQueues(input).map((queue) => queue.decisionQueueId),
    watchlistIds: getWatchlists(input).map((watchlist) => watchlist.watchlistId),
    surfaceCandidateIds: getSurfaceCandidates(input).map((candidate) => candidate.surfaceCandidateId),
  })}`;
}

function getAllSurfaceCandidates(input: BuildCommandCenterBriefingInput): SyntheticStructuredCommandCenterSurfaceCandidate[] {
  return [
    ...getExecutiveSummaries(input).flatMap((summary) => summary.surfaceCandidates),
    ...getDecisionQueues(input).flatMap((queue) => queue.surfaceCandidates),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.surfaceCandidates),
    ...getSurfaceCandidates(input),
  ];
}

function getHealthReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getExecutiveSummaries(input).flatMap((summary) => summary.healthReferenceIds),
    ...getAllSurfaceCandidates(input)
      .filter((candidate) => candidate.surfaceArtifactCategory === "health_item")
      .flatMap((candidate) => candidate.prioritizationPackage.evidencePackage.evidence.evidenceIds),
  ]);
}

function getAttentionReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getExecutiveSummaries(input).flatMap((summary) => summary.attentionReferenceIds),
    ...getDecisionQueues(input).flatMap((queue) => queue.attentionReferenceIds),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.attentionReferenceIds),
    ...getAllSurfaceCandidates(input).flatMap(
      (candidate) => candidate.prioritizationPackage.attentionMetadata?.attentionEvidenceIds ?? [],
    ),
  ]);
}

function getDecisionReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getExecutiveSummaries(input).flatMap((summary) => summary.decisionReferenceIds),
    ...getDecisionQueues(input).flatMap((queue) => queue.evidenceReferenceIds),
    ...getAllSurfaceCandidates(input).flatMap(
      (candidate) => candidate.prioritizationPackage.decisionQueueCompatibility?.decisionQueueEvidenceIds ?? [],
    ),
  ]);
}

function getRiskReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable(
    getAllSurfaceCandidates(input)
      .filter((candidate) => candidate.surfaceArtifactCategory === "risk_item")
      .flatMap((candidate) => candidate.prioritizationPackage.evidencePackage.evidence.evidenceIds),
  );
}

function getOpportunityReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable(
    getAllSurfaceCandidates(input)
      .filter((candidate) => candidate.surfaceArtifactCategory === "recommendation_item")
      .flatMap((candidate) => candidate.prioritizationPackage.evidencePackage.evidence.evidenceIds),
  );
}

function getWhyNowReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getExecutiveSummaries(input).flatMap((summary) => summary.whyNowReferenceIds),
    ...getDecisionQueues(input).flatMap((queue) => queue.whyNowReferenceIds),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.whyNowReferenceIds),
    ...getAllSurfaceCandidates(input).flatMap((candidate) => candidate.whyNowReasons),
  ]);
}

function getMemoryReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getExecutiveSummaries(input).flatMap((summary) => summary.memoryReferenceIds),
    ...getDecisionQueues(input).flatMap((queue) => queue.memoryReferenceIds),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.memoryReferenceIds),
    ...getAllSurfaceCandidates(input).flatMap((candidate) => candidate.memoryReferenceIds),
  ]);
}

function getOutcomeReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getExecutiveSummaries(input).flatMap((summary) => summary.outcomeReferenceIds),
    ...getDecisionQueues(input).flatMap((queue) => queue.outcomeReferenceIds),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.outcomeReferenceIds),
    ...getAllSurfaceCandidates(input).flatMap((candidate) => candidate.outcomeReferenceIds),
  ]);
}

function getEvidenceReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getExecutiveSummaries(input).flatMap((summary) => summary.evidenceReferenceIds),
    ...getDecisionQueues(input).flatMap((queue) => queue.evidenceReferenceIds),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.evidenceReferenceIds),
    ...getAllSurfaceCandidates(input).flatMap((candidate) => candidate.prioritizationPackage.evidencePackage.evidence.evidenceIds),
  ]);
}

function getTrustMetadata(input: BuildCommandCenterBriefingInput): SyntheticCommandCenterTrustMetadata[] {
  return [
    ...getDecisionQueues(input).flatMap((queue) => queue.trustMetadata),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.trustMetadata),
    ...compactDefined(getAllSurfaceCandidates(input).map((candidate) => candidate.prioritizationPackage.evidencePackage.trustMetadata)),
  ];
}

function getConfidenceMetadata(input: BuildCommandCenterBriefingInput): SyntheticCommandCenterConfidenceMetadata[] {
  return [
    ...getDecisionQueues(input).flatMap((queue) => queue.confidenceMetadata),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.confidenceMetadata),
    ...compactDefined(getAllSurfaceCandidates(input).map((candidate) => candidate.prioritizationPackage.evidencePackage.confidenceMetadata)),
  ];
}

function getDegradationMetadata(input: BuildCommandCenterBriefingInput): SyntheticCommandCenterDegradationMetadata[] {
  return [
    ...getDecisionQueues(input).flatMap((queue) => queue.degradationMetadata),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.degradationMetadata),
    ...compactDefined(getAllSurfaceCandidates(input).map((candidate) => candidate.prioritizationPackage.evidencePackage.degradationMetadata)),
  ];
}

function getRecoveryMetadata(input: BuildCommandCenterBriefingInput): SyntheticCommandCenterRecoveryMetadata[] {
  return [
    ...getDecisionQueues(input).flatMap((queue) => queue.recoveryMetadata),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.recoveryMetadata),
    ...compactDefined(getAllSurfaceCandidates(input).map((candidate) => candidate.prioritizationPackage.evidencePackage.recoveryMetadata)),
  ];
}

function getGovernanceMetadata(input: BuildCommandCenterBriefingInput): SyntheticCommandCenterGovernanceMetadata[] {
  return [
    ...getDecisionQueues(input).flatMap((queue) => queue.governanceMetadata),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.governanceMetadata),
    ...compactDefined(getAllSurfaceCandidates(input).map((candidate) => candidate.prioritizationPackage.evidencePackage.governanceMetadata)),
  ];
}

function getTrustReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getExecutiveSummaries(input).flatMap((summary) => summary.trustReferenceIds),
    ...getDecisionQueues(input).flatMap((queue) => queue.trustReferenceIds),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.trustReferenceIds),
  ]);
}

function getConfidenceReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getExecutiveSummaries(input).flatMap((summary) => summary.confidenceReferenceIds),
    ...getDecisionQueues(input).flatMap((queue) => queue.confidenceReferenceIds),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.confidenceReferenceIds),
  ]);
}

function getDegradationReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getExecutiveSummaries(input).flatMap((summary) => summary.degradationReferenceIds),
    ...getDecisionQueues(input).flatMap((queue) => queue.degradationReferenceIds),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.degradationReferenceIds),
  ]);
}

function getRecoveryReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getExecutiveSummaries(input).flatMap((summary) => summary.recoveryReferenceIds),
    ...getDecisionQueues(input).flatMap((queue) => queue.recoveryReferenceIds),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.recoveryReferenceIds),
  ]);
}

function getGovernanceReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getExecutiveSummaries(input).flatMap((summary) => summary.governanceReferenceIds),
    ...getDecisionQueues(input).flatMap((queue) => queue.governanceReferenceIds),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.governanceReferenceIds),
  ]);
}

function getRoleVisibilityDescriptors(input: BuildCommandCenterBriefingInput): SyntheticCommandCenterRoleVisibilityDescriptor[] {
  return [
    ...getDecisionQueues(input).flatMap((queue) => queue.roleVisibilityDescriptors),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.roleVisibilityDescriptors),
    ...compactDefined(getAllSurfaceCandidates(input).map((candidate) => candidate.prioritizationPackage.roleVisibilityDescriptor)),
  ];
}

function getRoleVisibilityCategories(input: BuildCommandCenterBriefingInput): SyntheticCommandCenterRoleCategory[] {
  return [
    ...new Set([
      ...getDecisionQueues(input).flatMap((queue) => queue.roleVisibilityCategories),
      ...getWatchlists(input).flatMap((watchlist) => watchlist.roleVisibilityCategories),
      ...getAllSurfaceCandidates(input).flatMap((candidate) => candidate.visibleRoleCategories),
    ]),
  ];
}

function getRoleVisibilityReferenceIds(input: BuildCommandCenterBriefingInput): string[] {
  return uniqueStable([
    ...getDecisionQueues(input).flatMap((queue) => queue.roleVisibilityReferenceIds),
    ...getWatchlists(input).flatMap((watchlist) => watchlist.roleVisibilityReferenceIds),
  ]);
}

function getIsolationMetadata(input: BuildCommandCenterBriefingInput): SyntheticCommandCenterBriefingIsolationMetadata {
  return {
    companyId: input.companyId,
    customerIsolationReferenceIds: input.isolationMetadata?.customerIsolationReferenceIds ?? [],
    firmIsolationReferenceIds: input.isolationMetadata?.firmIsolationReferenceIds ?? [],
    clientIsolationReferenceIds: input.isolationMetadata?.clientIsolationReferenceIds ?? [],
  };
}

function validateArtifacts(input: BuildCommandCenterBriefingInput): string[] {
  const warnings: string[] = [];

  for (const summary of getExecutiveSummaries(input)) {
    if (!hasValue(summary.executiveSummaryId)) warnings.push("executiveSummaryId is required.");
    if (summary.companyId !== input.companyId) warnings.push("executive summary companyId must match input companyId.");
  }
  for (const queue of getDecisionQueues(input)) {
    if (!hasValue(queue.decisionQueueId)) warnings.push("decisionQueueId is required.");
    if (queue.companyId !== input.companyId) warnings.push("decision queue companyId must match input companyId.");
  }
  for (const watchlist of getWatchlists(input)) {
    if (!hasValue(watchlist.watchlistId)) warnings.push("watchlistId is required.");
    if (watchlist.companyId !== input.companyId) warnings.push("watchlist companyId must match input companyId.");
  }
  for (const candidate of getSurfaceCandidates(input)) {
    if (!hasValue(candidate.surfaceCandidateId)) warnings.push("surfaceCandidateId is required.");
    if (candidate.companyId !== input.companyId) warnings.push("surface candidate companyId must match input companyId.");
  }

  return warnings;
}

function validateInput(input: BuildCommandCenterBriefingInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!hasValue(input.briefingKey)) warnings.push("briefingKey is required.");
  if (!BRIEFING_TYPES.includes(input.briefingType)) warnings.push("briefingType is not supported.");
  if (!input.cadenceMetadata || !BRIEFING_CADENCES.includes(input.cadenceMetadata.cadence)) {
    warnings.push("cadenceMetadata.cadence is not supported.");
  }
  if (input.executiveSummaries !== undefined && !Array.isArray(input.executiveSummaries)) {
    warnings.push("executiveSummaries must be an array.");
  }
  if (input.decisionQueues !== undefined && !Array.isArray(input.decisionQueues)) {
    warnings.push("decisionQueues must be an array.");
  }
  if (input.watchlists !== undefined && !Array.isArray(input.watchlists)) {
    warnings.push("watchlists must be an array.");
  }
  if (input.surfaceCandidates !== undefined && !Array.isArray(input.surfaceCandidates)) {
    warnings.push("surfaceCandidates must be an array.");
  }
  if (warnings.length > 0) return warnings;

  const artifactCount =
    getExecutiveSummaries(input).length + getDecisionQueues(input).length + getWatchlists(input).length + getSurfaceCandidates(input).length;
  if (artifactCount === 0) {
    warnings.push("at least one approved briefing artifact is required.");
  }

  return [...warnings, ...validateArtifacts(input)];
}

export function buildCommandCenterBriefing(input: BuildCommandCenterBriefingInput): BuildCommandCenterBriefingResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      briefing: null,
      skipped: true,
      warnings,
    };
  }

  return {
    briefing: {
      briefingId: buildBriefingId(input),
      companyId: input.companyId,
      briefingKey: input.briefingKey,
      briefingType: input.briefingType,
      cadenceMetadata: input.cadenceMetadata,
      consumptionSectionOrder: SYNTHETIC_COMMAND_CENTER_BRIEFING_CONSUMPTION_SECTION_ORDER,
      executiveSummaries: getExecutiveSummaries(input),
      decisionQueues: getDecisionQueues(input),
      watchlists: getWatchlists(input),
      surfaceCandidates: getSurfaceCandidates(input),
      executiveSummaryIds: getExecutiveSummaries(input).map((summary) => summary.executiveSummaryId),
      decisionQueueIds: getDecisionQueues(input).map((queue) => queue.decisionQueueId),
      watchlistIds: getWatchlists(input).map((watchlist) => watchlist.watchlistId),
      surfaceCandidateIds: getSurfaceCandidates(input).map((candidate) => candidate.surfaceCandidateId),
      healthReferenceIds: getHealthReferenceIds(input),
      attentionReferenceIds: getAttentionReferenceIds(input),
      decisionReferenceIds: getDecisionReferenceIds(input),
      riskReferenceIds: getRiskReferenceIds(input),
      opportunityReferenceIds: getOpportunityReferenceIds(input),
      whyNowReferenceIds: getWhyNowReferenceIds(input),
      memoryReferenceIds: getMemoryReferenceIds(input),
      outcomeReferenceIds: getOutcomeReferenceIds(input),
      evidenceReferenceIds: getEvidenceReferenceIds(input),
      trustMetadata: getTrustMetadata(input),
      trustReferenceIds: getTrustReferenceIds(input),
      confidenceMetadata: getConfidenceMetadata(input),
      confidenceReferenceIds: getConfidenceReferenceIds(input),
      degradationMetadata: getDegradationMetadata(input),
      degradationReferenceIds: getDegradationReferenceIds(input),
      recoveryMetadata: getRecoveryMetadata(input),
      recoveryReferenceIds: getRecoveryReferenceIds(input),
      governanceMetadata: getGovernanceMetadata(input),
      governanceReferenceIds: getGovernanceReferenceIds(input),
      roleVisibilityDescriptors: getRoleVisibilityDescriptors(input),
      roleVisibilityCategories: getRoleVisibilityCategories(input),
      roleVisibilityReferenceIds: getRoleVisibilityReferenceIds(input),
      isolationMetadata: getIsolationMetadata(input),
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
