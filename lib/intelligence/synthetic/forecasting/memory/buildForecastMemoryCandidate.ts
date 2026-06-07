import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticStructuredForecastCandidate } from "../candidates";
import type {
  SyntheticForecastAccuracy,
  SyntheticForecastApproval,
  SyntheticForecastBias,
  SyntheticForecastCategory,
  SyntheticForecastConsensus,
  SyntheticForecastDriver,
  SyntheticForecastEvidenceStrength,
  SyntheticForecastGranularityLevel,
  SyntheticForecastHorizon,
  SyntheticForecastLineage,
  SyntheticForecastMacroeconomicContext,
  SyntheticForecastMethodologyType,
  SyntheticForecastReliability,
  SyntheticForecastRisk,
  SyntheticForecastSeasonality,
  SyntheticForecastSensitivity,
  SyntheticForecastSource,
  SyntheticForecastVersion,
  SyntheticForecastAssumption,
} from "../types";
import type { SyntheticForecastGovernanceStatus, SyntheticForecastRefreshStatus } from "../evidence";

export type SyntheticForecastMemoryKey =
  | "revenue_forecast"
  | "expense_forecast"
  | "payroll_forecast"
  | "workforce_forecast"
  | "cash_forecast"
  | "working_capital_forecast"
  | "inventory_forecast"
  | "treasury_forecast"
  | "tax_forecast"
  | "healthcare_forecast"
  | "manufacturing_forecast"
  | "construction_forecast"
  | "municipality_forecast"
  | "strategic_forecast";

export interface SyntheticForecastMemoryCandidate {
  candidateId: string;
  companyId: string;
  forecastId: string;
  forecastCategory: SyntheticForecastCategory;
  forecastHorizon: SyntheticForecastHorizon;
  forecastMethodology: SyntheticForecastMethodologyType;
  forecastGranularity: SyntheticForecastGranularityLevel;
  forecastSource: SyntheticForecastSource;
  memoryKey: SyntheticForecastMemoryKey;
  evidenceId: string;
  supportingMemoryIds: string[];
  supportingFteObservationIds: string[];
  supportingFtePatternIds: string[];
  supportingFluxObservationIds: string[];
  supportingFluxPatternIds: string[];
  supportingCommentaryIds: string[];
  supportingRecommendationIds: string[];
  supportingRecommendationOutcomeIds: string[];
  supportingRiskIds: string[];
  supportingSourceReferenceIds: string[];
  supportingDriverIds: string[];
  supportingAssumptionIds: string[];
  confidenceScore: number;
  confidenceReason: string;
  forecastConfidence: number | undefined;
  evidenceStrength: SyntheticForecastEvidenceStrength;
  dataCompletenessScore: number;
  historicalStabilityScore: number | undefined;
  forecastRiskScore: number | undefined;
  assumptions: SyntheticForecastAssumption[];
  drivers: SyntheticForecastDriver[];
  risks: SyntheticForecastRisk[];
  accuracy: SyntheticForecastAccuracy | undefined;
  reliability: SyntheticForecastReliability | undefined;
  version: SyntheticForecastVersion | undefined;
  consensus: SyntheticForecastConsensus | undefined;
  sensitivity: SyntheticForecastSensitivity | undefined;
  bias: SyntheticForecastBias | undefined;
  seasonality: SyntheticForecastSeasonality | undefined;
  macroeconomicContext: SyntheticForecastMacroeconomicContext | undefined;
  approval: SyntheticForecastApproval | undefined;
  forecastAccuracyScore: number | undefined;
  forecastAccuracyPercent: number | undefined;
  forecastAccuracyTrend: string | undefined;
  forecastError: number | undefined;
  forecastReliabilityScore: number | undefined;
  forecastReliabilityReason: string | undefined;
  historicalForecastConsistency: number | undefined;
  forecastVersion: string | undefined;
  priorForecastVersion: string | undefined;
  forecastRevisionReason: string | undefined;
  forecastDelta: number | undefined;
  forecastConsensus: string | undefined;
  forecastVarianceToBudget: number | undefined;
  forecastVarianceToManagement: number | undefined;
  forecastVarianceToBoard: number | undefined;
  forecastDriverSensitivity: Record<string, number> | undefined;
  forecastDriverImpactRank: string[] | undefined;
  sensitivityScore: number | undefined;
  forecastBiasDirection: SyntheticForecastBias["forecastBiasDirection"] | undefined;
  forecastBiasMagnitude: number | undefined;
  forecastBiasConfidence: number | undefined;
  seasonalityFactor: number | undefined;
  seasonalityPattern: string | undefined;
  seasonalityConfidence: number | undefined;
  macroeconomicIndicatorIds: string[];
  macroeconomicAssumptions: string[];
  macroeconomicConfidence: number | undefined;
  forecastReviewStatus: SyntheticForecastApproval["forecastReviewStatus"] | undefined;
  forecastApprovalStatus: SyntheticForecastApproval["forecastApprovalStatus"] | undefined;
  forecastApprovalLevel: SyntheticForecastApproval["forecastApprovalLevel"] | undefined;
  methodologyId: string | undefined;
  methodologyCategory: SyntheticForecastMethodologyType | undefined;
  methodologyConfidence: number | undefined;
  methodologyReason: string | undefined;
  methodologyLineage: string[];
  forecastSourceLevel: SyntheticForecastGranularityLevel | undefined;
  forecastRollupLevel: SyntheticForecastGranularityLevel | undefined;
  forecastLineage: string[];
  governanceStatus: SyntheticForecastGovernanceStatus;
  refreshStatus: SyntheticForecastRefreshStatus;
  lineage: SyntheticForecastLineage;
}

export interface BuildForecastMemoryCandidateInput {
  companyId: string;
  candidate: SyntheticStructuredForecastCandidate | null;
}

export interface BuildForecastMemoryCandidateResult {
  candidate: SyntheticForecastMemoryCandidate | null;
  skipped: boolean;
  warnings: string[];
}

export const FORECAST_CATEGORY_MEMORY_KEY_MAP: Record<SyntheticForecastCategory, SyntheticForecastMemoryKey> = {
  revenue: "revenue_forecast",
  expense: "expense_forecast",
  payroll: "payroll_forecast",
  workforce: "workforce_forecast",
  cash: "cash_forecast",
  working_capital: "working_capital_forecast",
  inventory: "inventory_forecast",
  treasury: "treasury_forecast",
  tax: "tax_forecast",
  healthcare: "healthcare_forecast",
  manufacturing: "manufacturing_forecast",
  construction: "construction_forecast",
  municipality: "municipality_forecast",
  strategic: "strategic_forecast",
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function hasSupportingEvidence(candidate: SyntheticStructuredForecastCandidate): boolean {
  return (
    candidate.supportingMemoryIds.length > 0 ||
    candidate.supportingFteObservationIds.length > 0 ||
    candidate.supportingFtePatternIds.length > 0 ||
    candidate.supportingFluxObservationIds.length > 0 ||
    candidate.supportingFluxPatternIds.length > 0 ||
    candidate.supportingCommentaryIds.length > 0 ||
    candidate.supportingRecommendationIds.length > 0 ||
    candidate.supportingRecommendationOutcomeIds.length > 0 ||
    candidate.supportingRiskIds.length > 0 ||
    candidate.supportingSourceReferenceIds.length > 0 ||
    candidate.supportingDriverIds.length > 0 ||
    candidate.supportingAssumptionIds.length > 0
  );
}

function getAllSupportingReferenceIds(candidate: SyntheticStructuredForecastCandidate): string[] {
  return uniqueSorted([
    ...candidate.supportingMemoryIds,
    ...candidate.supportingFteObservationIds,
    ...candidate.supportingFtePatternIds,
    ...candidate.supportingFluxObservationIds,
    ...candidate.supportingFluxPatternIds,
    ...candidate.supportingCommentaryIds,
    ...candidate.supportingRecommendationIds,
    ...candidate.supportingRecommendationOutcomeIds,
    ...candidate.supportingRiskIds,
    ...candidate.supportingSourceReferenceIds,
    ...candidate.supportingDriverIds,
    ...candidate.supportingAssumptionIds,
  ]);
}

function buildCandidateId(
  input: BuildForecastMemoryCandidateInput,
  candidate: SyntheticStructuredForecastCandidate,
): string {
  return `forecast-memory-candidate:${stableSnapshotHash({
    companyId: input.companyId,
    forecastId: candidate.forecastId,
    forecastCategory: candidate.forecastCategory,
    forecastHorizon: candidate.forecastHorizon,
    forecastMethodology: candidate.forecastMethodology,
    forecastGranularity: candidate.forecastGranularity,
    forecastSource: candidate.forecastSource,
    evidenceId: candidate.evidenceId,
    supportingReferenceIds: getAllSupportingReferenceIds(candidate),
  })}`;
}

function validateInput(input: BuildForecastMemoryCandidateInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!input.candidate) {
    warnings.push("candidate is required.");
    return warnings;
  }
  if (input.candidate.companyId !== input.companyId) {
    warnings.push("candidate companyId must match input companyId.");
  }
  if (!hasValue(input.candidate.forecastId)) warnings.push("forecastId is required.");
  if (!hasValue(input.candidate.forecastCategory)) warnings.push("forecastCategory is required.");
  if (!hasValue(input.candidate.forecastHorizon)) warnings.push("forecastHorizon is required.");
  if (!hasValue(input.candidate.forecastMethodology)) warnings.push("forecastMethodology is required.");
  if (!hasValue(input.candidate.forecastGranularity)) warnings.push("forecastGranularity is required.");
  if (!hasValue(input.candidate.forecastSource)) warnings.push("forecastSource is required.");
  if (!hasValue(input.candidate.evidenceId)) warnings.push("evidenceId is required.");
  if (!hasSupportingEvidence(input.candidate)) warnings.push("supporting evidence references are required.");
  if (!input.candidate.supportingSourceReferenceIds?.length) warnings.push("source references are required.");
  if (!input.candidate.lineage) warnings.push("lineage is required.");
  if (!FORECAST_CATEGORY_MEMORY_KEY_MAP[input.candidate.forecastCategory]) {
    warnings.push("forecastCategory cannot be mapped to a Forecast memory key.");
  }

  return warnings;
}

export function buildForecastMemoryCandidate(
  input: BuildForecastMemoryCandidateInput,
): BuildForecastMemoryCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.candidate) {
    return {
      candidate: null,
      skipped: true,
      warnings,
    };
  }

  const candidate = input.candidate;

  return {
    candidate: {
      candidateId: buildCandidateId(input, candidate),
      companyId: input.companyId,
      forecastId: candidate.forecastId,
      forecastCategory: candidate.forecastCategory,
      forecastHorizon: candidate.forecastHorizon,
      forecastMethodology: candidate.forecastMethodology,
      forecastGranularity: candidate.forecastGranularity,
      forecastSource: candidate.forecastSource,
      memoryKey: FORECAST_CATEGORY_MEMORY_KEY_MAP[candidate.forecastCategory],
      evidenceId: candidate.evidenceId,
      supportingMemoryIds: candidate.supportingMemoryIds,
      supportingFteObservationIds: candidate.supportingFteObservationIds,
      supportingFtePatternIds: candidate.supportingFtePatternIds,
      supportingFluxObservationIds: candidate.supportingFluxObservationIds,
      supportingFluxPatternIds: candidate.supportingFluxPatternIds,
      supportingCommentaryIds: candidate.supportingCommentaryIds,
      supportingRecommendationIds: candidate.supportingRecommendationIds,
      supportingRecommendationOutcomeIds: candidate.supportingRecommendationOutcomeIds,
      supportingRiskIds: candidate.supportingRiskIds,
      supportingSourceReferenceIds: candidate.supportingSourceReferenceIds,
      supportingDriverIds: candidate.supportingDriverIds,
      supportingAssumptionIds: candidate.supportingAssumptionIds,
      confidenceScore: candidate.confidenceScore,
      confidenceReason: candidate.confidenceReason,
      forecastConfidence: candidate.forecastConfidence,
      evidenceStrength: candidate.evidenceStrength,
      dataCompletenessScore: candidate.dataCompletenessScore,
      historicalStabilityScore: candidate.historicalStabilityScore,
      forecastRiskScore: candidate.forecastRiskScore,
      assumptions: candidate.assumptions,
      drivers: candidate.drivers,
      risks: candidate.risks,
      accuracy: candidate.accuracy,
      reliability: candidate.reliability,
      version: candidate.version,
      consensus: candidate.consensus,
      sensitivity: candidate.sensitivity,
      bias: candidate.bias,
      seasonality: candidate.seasonality,
      macroeconomicContext: candidate.macroeconomicContext,
      approval: candidate.approval,
      forecastAccuracyScore: candidate.forecastAccuracyScore,
      forecastAccuracyPercent: candidate.forecastAccuracyPercent,
      forecastAccuracyTrend: candidate.forecastAccuracyTrend,
      forecastError: candidate.forecastError,
      forecastReliabilityScore: candidate.forecastReliabilityScore,
      forecastReliabilityReason: candidate.forecastReliabilityReason,
      historicalForecastConsistency: candidate.historicalForecastConsistency,
      forecastVersion: candidate.forecastVersion,
      priorForecastVersion: candidate.priorForecastVersion,
      forecastRevisionReason: candidate.forecastRevisionReason,
      forecastDelta: candidate.forecastDelta,
      forecastConsensus: candidate.forecastConsensus,
      forecastVarianceToBudget: candidate.forecastVarianceToBudget,
      forecastVarianceToManagement: candidate.forecastVarianceToManagement,
      forecastVarianceToBoard: candidate.forecastVarianceToBoard,
      forecastDriverSensitivity: candidate.forecastDriverSensitivity,
      forecastDriverImpactRank: candidate.forecastDriverImpactRank,
      sensitivityScore: candidate.sensitivityScore,
      forecastBiasDirection: candidate.forecastBiasDirection,
      forecastBiasMagnitude: candidate.forecastBiasMagnitude,
      forecastBiasConfidence: candidate.forecastBiasConfidence,
      seasonalityFactor: candidate.seasonalityFactor,
      seasonalityPattern: candidate.seasonalityPattern,
      seasonalityConfidence: candidate.seasonalityConfidence,
      macroeconomicIndicatorIds: candidate.macroeconomicIndicatorIds,
      macroeconomicAssumptions: candidate.macroeconomicAssumptions,
      macroeconomicConfidence: candidate.macroeconomicConfidence,
      forecastReviewStatus: candidate.forecastReviewStatus,
      forecastApprovalStatus: candidate.forecastApprovalStatus,
      forecastApprovalLevel: candidate.forecastApprovalLevel,
      methodologyId: candidate.methodologyId,
      methodologyCategory: candidate.methodologyCategory,
      methodologyConfidence: candidate.methodologyConfidence,
      methodologyReason: candidate.methodologyReason,
      methodologyLineage: candidate.methodologyLineage,
      forecastSourceLevel: candidate.forecastSourceLevel,
      forecastRollupLevel: candidate.forecastRollupLevel,
      forecastLineage: candidate.forecastLineage,
      governanceStatus: candidate.governanceStatus,
      refreshStatus: candidate.refreshStatus,
      lineage: {
        ...candidate.lineage,
        sourceReferenceIds: uniqueSorted([
          ...candidate.lineage.sourceReferenceIds,
          ...candidate.supportingSourceReferenceIds,
        ]),
        assumptionIds: uniqueSorted([...candidate.lineage.assumptionIds, ...candidate.supportingAssumptionIds]),
        driverIds: uniqueSorted([...candidate.lineage.driverIds, ...candidate.supportingDriverIds]),
        recommendationIds: uniqueSorted([
          ...candidate.lineage.recommendationIds,
          ...candidate.supportingRecommendationIds,
        ]),
        riskIds: uniqueSorted([...candidate.lineage.riskIds, ...candidate.supportingRiskIds]),
      },
    },
    skipped: false,
    warnings: [],
  };
}
