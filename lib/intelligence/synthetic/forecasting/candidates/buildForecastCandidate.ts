import { stableSnapshotHash } from "../../historical-snapshots";
import {
  SYNTHETIC_FORECAST_CATEGORIES,
  SYNTHETIC_FORECAST_EVIDENCE_STRENGTHS,
  SYNTHETIC_FORECAST_GRANULARITY_LEVELS,
  SYNTHETIC_FORECAST_HORIZONS,
  SYNTHETIC_FORECAST_METHODOLOGIES,
  SYNTHETIC_FORECAST_SOURCES,
} from "../constants";
import type {
  SyntheticForecastAccuracy,
  SyntheticForecastApproval,
  SyntheticForecastBias,
  SyntheticForecastCategory,
  SyntheticForecastConsensus,
  SyntheticForecastDriver,
  SyntheticForecastEvidenceStrength,
  SyntheticForecastGranularity,
  SyntheticForecastGranularityLevel,
  SyntheticForecastHorizon,
  SyntheticForecastLineage,
  SyntheticForecastMacroeconomicContext,
  SyntheticForecastMethodology,
  SyntheticForecastMethodologyType,
  SyntheticForecastReliability,
  SyntheticForecastRisk,
  SyntheticForecastSeasonality,
  SyntheticForecastSensitivity,
  SyntheticForecastSource,
  SyntheticForecastVersion,
  SyntheticForecastAssumption,
} from "../types";
import type {
  SyntheticForecastEvidencePackage,
  SyntheticForecastGovernanceStatus,
  SyntheticForecastRefreshStatus,
} from "../evidence";

export interface SyntheticForecastCandidateFocus {
  focusType: string;
  labels: string[];
}

export interface BuildForecastCandidateInput {
  companyId: string;
  forecastCategory: SyntheticForecastCategory;
  forecastHorizon: SyntheticForecastHorizon;
  forecastMethodology: SyntheticForecastMethodologyType;
  forecastGranularity: SyntheticForecastGranularityLevel;
  forecastSource: SyntheticForecastSource;
  evidencePackage: SyntheticForecastEvidencePackage | null;
  assumptions?: SyntheticForecastAssumption[];
  drivers?: SyntheticForecastDriver[];
  risks?: SyntheticForecastRisk[];
  accuracy?: SyntheticForecastAccuracy;
  reliability?: SyntheticForecastReliability;
  version?: SyntheticForecastVersion;
  consensus?: SyntheticForecastConsensus;
  sensitivity?: SyntheticForecastSensitivity;
  bias?: SyntheticForecastBias;
  seasonality?: SyntheticForecastSeasonality;
  macroeconomicContext?: SyntheticForecastMacroeconomicContext;
  approval?: SyntheticForecastApproval;
  granularity?: Partial<SyntheticForecastGranularity>;
  methodology?: Partial<SyntheticForecastMethodology>;
}

export interface SyntheticStructuredForecastCandidate {
  forecastId: string;
  companyId: string;
  forecastCategory: SyntheticForecastCategory;
  forecastHorizon: SyntheticForecastHorizon;
  forecastMethodology: SyntheticForecastMethodologyType;
  forecastGranularity: SyntheticForecastGranularityLevel;
  forecastSource: SyntheticForecastSource;
  evidenceId: string;
  forecastFocus: SyntheticForecastCandidateFocus;
  assumptionFocus: SyntheticForecastCandidateFocus;
  driverFocus: SyntheticForecastCandidateFocus;
  riskFocus: SyntheticForecastCandidateFocus;
  methodologyFocus: SyntheticForecastCandidateFocus;
  granularityFocus: SyntheticForecastCandidateFocus;
  sensitivityFocus: SyntheticForecastCandidateFocus;
  reliabilityFocus: SyntheticForecastCandidateFocus;
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
  forecastConfidence?: number;
  evidenceStrength: SyntheticForecastEvidenceStrength;
  dataCompletenessScore: number;
  historicalStabilityScore?: number;
  forecastRiskScore?: number;
  lineage: SyntheticForecastLineage;
  governanceStatus: SyntheticForecastGovernanceStatus;
  refreshStatus: SyntheticForecastRefreshStatus;
  missingDataFlags: string[];
  forecastAccuracyScore?: number;
  forecastAccuracyPercent?: number;
  forecastAccuracyTrend?: string;
  forecastError?: number;
  forecastReliabilityScore?: number;
  forecastReliabilityReason?: string;
  historicalForecastConsistency?: number;
  forecastVersion?: string;
  priorForecastVersion?: string;
  forecastRevisionReason?: string;
  forecastDelta?: number;
  forecastConsensus?: string;
  forecastVarianceToBudget?: number;
  forecastVarianceToManagement?: number;
  forecastVarianceToBoard?: number;
  forecastDriverSensitivity?: Record<string, number>;
  forecastDriverImpactRank?: string[];
  sensitivityScore?: number;
  forecastBiasDirection?: SyntheticForecastBias["forecastBiasDirection"];
  forecastBiasMagnitude?: number;
  forecastBiasConfidence?: number;
  seasonalityFactor?: number;
  seasonalityPattern?: string;
  seasonalityConfidence?: number;
  macroeconomicIndicatorIds: string[];
  macroeconomicAssumptions: string[];
  macroeconomicConfidence?: number;
  forecastReviewStatus?: SyntheticForecastApproval["forecastReviewStatus"];
  forecastApprovalStatus?: SyntheticForecastApproval["forecastApprovalStatus"];
  forecastApprovalLevel?: SyntheticForecastApproval["forecastApprovalLevel"];
  forecastSourceLevel?: SyntheticForecastGranularityLevel;
  forecastRollupLevel?: SyntheticForecastGranularityLevel;
  forecastLineage: string[];
  methodologyId?: string;
  methodologyCategory?: SyntheticForecastMethodologyType;
  methodologyConfidence?: number;
  methodologyReason?: string;
  methodologyLineage: string[];
  assumptions: SyntheticForecastAssumption[];
  drivers: SyntheticForecastDriver[];
  risks: SyntheticForecastRisk[];
  accuracy?: SyntheticForecastAccuracy;
  reliability?: SyntheticForecastReliability;
  version?: SyntheticForecastVersion;
  consensus?: SyntheticForecastConsensus;
  sensitivity?: SyntheticForecastSensitivity;
  bias?: SyntheticForecastBias;
  seasonality?: SyntheticForecastSeasonality;
  macroeconomicContext?: SyntheticForecastMacroeconomicContext;
  approval?: SyntheticForecastApproval;
  warnings: string[];
}

export interface BuildForecastCandidateResult {
  candidate: SyntheticStructuredForecastCandidate | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function hasSupportingEvidence(evidencePackage: SyntheticForecastEvidencePackage): boolean {
  return (
    evidencePackage.supportingMemoryIds.length > 0 ||
    evidencePackage.supportingFteObservationIds.length > 0 ||
    evidencePackage.supportingFtePatternIds.length > 0 ||
    evidencePackage.supportingFluxObservationIds.length > 0 ||
    evidencePackage.supportingFluxPatternIds.length > 0 ||
    evidencePackage.supportingCommentaryIds.length > 0 ||
    evidencePackage.supportingRecommendationIds.length > 0 ||
    evidencePackage.supportingRecommendationOutcomeIds.length > 0 ||
    evidencePackage.supportingRiskIds.length > 0 ||
    evidencePackage.supportingSourceReferenceIds.length > 0 ||
    evidencePackage.supportingDriverIds.length > 0 ||
    evidencePackage.supportingAssumptionIds.length > 0
  );
}

function buildForecastId(input: BuildForecastCandidateInput): string {
  return `forecast-candidate:${stableSnapshotHash({
    companyId: input.companyId,
    forecastCategory: input.forecastCategory,
    forecastHorizon: input.forecastHorizon,
    forecastMethodology: input.forecastMethodology,
    forecastGranularity: input.forecastGranularity,
    forecastSource: input.forecastSource,
    evidenceId: input.evidencePackage?.evidenceId ?? null,
    supportingMemoryIds: input.evidencePackage?.supportingMemoryIds ?? [],
    supportingFteObservationIds: input.evidencePackage?.supportingFteObservationIds ?? [],
    supportingFtePatternIds: input.evidencePackage?.supportingFtePatternIds ?? [],
    supportingFluxObservationIds: input.evidencePackage?.supportingFluxObservationIds ?? [],
    supportingFluxPatternIds: input.evidencePackage?.supportingFluxPatternIds ?? [],
    supportingCommentaryIds: input.evidencePackage?.supportingCommentaryIds ?? [],
    supportingRecommendationIds: input.evidencePackage?.supportingRecommendationIds ?? [],
    supportingRecommendationOutcomeIds: input.evidencePackage?.supportingRecommendationOutcomeIds ?? [],
    supportingRiskIds: input.evidencePackage?.supportingRiskIds ?? [],
    supportingSourceReferenceIds: input.evidencePackage?.supportingSourceReferenceIds ?? [],
    supportingDriverIds: input.evidencePackage?.supportingDriverIds ?? [],
    supportingAssumptionIds: input.evidencePackage?.supportingAssumptionIds ?? [],
  })}`;
}

function buildFocus(focusType: string, labels: string[]): SyntheticForecastCandidateFocus {
  return {
    focusType,
    labels: uniqueSorted(labels),
  };
}

function validateInput(input: BuildForecastCandidateInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!SYNTHETIC_FORECAST_CATEGORIES.includes(input.forecastCategory)) {
    warnings.push("forecastCategory is not supported.");
  }
  if (!SYNTHETIC_FORECAST_HORIZONS.includes(input.forecastHorizon)) {
    warnings.push("forecastHorizon is not supported.");
  }
  if (!SYNTHETIC_FORECAST_METHODOLOGIES.includes(input.forecastMethodology)) {
    warnings.push("forecastMethodology is not supported.");
  }
  if (!SYNTHETIC_FORECAST_GRANULARITY_LEVELS.includes(input.forecastGranularity)) {
    warnings.push("forecastGranularity is not supported.");
  }
  if (!SYNTHETIC_FORECAST_SOURCES.includes(input.forecastSource)) {
    warnings.push("forecastSource is not supported.");
  }
  if (!input.evidencePackage) {
    warnings.push("evidencePackage is required.");
    return warnings;
  }
  if (input.evidencePackage.companyId !== input.companyId) {
    warnings.push("evidence package companyId must match input companyId.");
  }
  if (input.evidencePackage.forecastCategory !== input.forecastCategory) {
    warnings.push("evidence package forecastCategory must match input forecastCategory.");
  }
  if (input.evidencePackage.forecastHorizon !== input.forecastHorizon) {
    warnings.push("evidence package forecastHorizon must match input forecastHorizon.");
  }
  if (input.evidencePackage.forecastMethodology !== input.forecastMethodology) {
    warnings.push("evidence package forecastMethodology must match input forecastMethodology.");
  }
  if (input.evidencePackage.forecastGranularity !== input.forecastGranularity) {
    warnings.push("evidence package forecastGranularity must match input forecastGranularity.");
  }
  if (input.evidencePackage.forecastSource !== input.forecastSource) {
    warnings.push("evidence package forecastSource must match input forecastSource.");
  }
  if (!hasSupportingEvidence(input.evidencePackage)) {
    warnings.push("at least one supporting evidence ID is required.");
  }
  if (
    typeof input.evidencePackage.confidenceScore !== "number" ||
    Number.isNaN(input.evidencePackage.confidenceScore)
  ) {
    warnings.push("confidenceScore must be present.");
  }
  if (!SYNTHETIC_FORECAST_EVIDENCE_STRENGTHS.includes(input.evidencePackage.evidenceStrength)) {
    warnings.push("evidenceStrength is required.");
  }
  if (
    typeof input.evidencePackage.dataCompletenessScore !== "number" ||
    Number.isNaN(input.evidencePackage.dataCompletenessScore)
  ) {
    warnings.push("dataCompletenessScore must be present.");
  }
  if (!input.evidencePackage.lineage) {
    warnings.push("lineage is required.");
  }

  return warnings;
}

export function buildForecastCandidate(input: BuildForecastCandidateInput): BuildForecastCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.evidencePackage) {
    return {
      candidate: null,
      skipped: true,
      warnings,
    };
  }

  const evidencePackage = input.evidencePackage;
  const assumptions = input.assumptions ?? [];
  const drivers = input.drivers ?? [];
  const risks = input.risks ?? [];
  const accuracy = input.accuracy;
  const reliability = input.reliability;
  const version = input.version;
  const consensus = input.consensus;
  const sensitivity = input.sensitivity;
  const bias = input.bias;
  const seasonality = input.seasonality;
  const macroeconomicContext = input.macroeconomicContext;
  const approval = input.approval;

  return {
    candidate: {
      forecastId: buildForecastId(input),
      companyId: input.companyId,
      forecastCategory: input.forecastCategory,
      forecastHorizon: input.forecastHorizon,
      forecastMethodology: input.forecastMethodology,
      forecastGranularity: input.forecastGranularity,
      forecastSource: input.forecastSource,
      evidenceId: evidencePackage.evidenceId,
      forecastFocus: buildFocus("forecast_metadata", [
        input.forecastCategory,
        input.forecastHorizon,
        input.forecastMethodology,
        input.forecastGranularity,
        input.forecastSource,
      ]),
      assumptionFocus: buildFocus(
        "assumption_metadata",
        assumptions.map((assumption) => assumption.assumptionCategory),
      ),
      driverFocus: buildFocus(
        "driver_metadata",
        drivers.flatMap((driver) => [driver.driverCategory, ...driver.forecastDriverIds]),
      ),
      riskFocus: buildFocus(
        "risk_metadata",
        risks.flatMap((risk) => [risk.riskSeverity, risk.riskProbability, ...risk.riskIds]),
      ),
      methodologyFocus: buildFocus("methodology_metadata", [
        input.methodology?.methodologyCategory ?? evidencePackage.methodologyCategory ?? input.forecastMethodology,
        input.methodology?.methodologyId ?? evidencePackage.methodologyId ?? "",
        input.methodology?.methodologyReason ?? evidencePackage.methodologyReason ?? "",
      ]),
      granularityFocus: buildFocus("granularity_metadata", [
        input.granularity?.forecastSourceLevel ?? evidencePackage.forecastSourceLevel ?? input.forecastGranularity,
        input.granularity?.forecastRollupLevel ?? evidencePackage.forecastRollupLevel ?? "",
      ]),
      sensitivityFocus: buildFocus("sensitivity_metadata", [
        ...(sensitivity?.forecastDriverImpactRank ?? []),
        sensitivity?.sensitivityScore !== undefined ? "sensitivity_score" : "",
      ]),
      reliabilityFocus: buildFocus("reliability_metadata", [
        reliability?.forecastReliabilityReason ?? "",
        reliability?.forecastReliabilityScore !== undefined || evidencePackage.forecastReliabilityScore !== undefined
          ? "forecast_reliability_score"
          : "",
      ]),
      supportingMemoryIds: evidencePackage.supportingMemoryIds,
      supportingFteObservationIds: evidencePackage.supportingFteObservationIds,
      supportingFtePatternIds: evidencePackage.supportingFtePatternIds,
      supportingFluxObservationIds: evidencePackage.supportingFluxObservationIds,
      supportingFluxPatternIds: evidencePackage.supportingFluxPatternIds,
      supportingCommentaryIds: evidencePackage.supportingCommentaryIds,
      supportingRecommendationIds: evidencePackage.supportingRecommendationIds,
      supportingRecommendationOutcomeIds: evidencePackage.supportingRecommendationOutcomeIds,
      supportingRiskIds: evidencePackage.supportingRiskIds,
      supportingSourceReferenceIds: evidencePackage.supportingSourceReferenceIds,
      supportingDriverIds: evidencePackage.supportingDriverIds,
      supportingAssumptionIds: evidencePackage.supportingAssumptionIds,
      confidenceScore: evidencePackage.confidenceScore,
      confidenceReason: evidencePackage.confidenceReason,
      forecastConfidence: evidencePackage.forecastConfidence,
      evidenceStrength: evidencePackage.evidenceStrength,
      dataCompletenessScore: evidencePackage.dataCompletenessScore,
      historicalStabilityScore: evidencePackage.historicalStabilityScore,
      forecastRiskScore: evidencePackage.forecastRiskScore,
      lineage: evidencePackage.lineage,
      governanceStatus: evidencePackage.governanceStatus,
      refreshStatus: evidencePackage.refreshStatus,
      missingDataFlags: evidencePackage.missingDataFlags,
      forecastAccuracyScore: accuracy?.forecastAccuracyScore ?? evidencePackage.forecastAccuracyScore,
      forecastAccuracyPercent: accuracy?.forecastAccuracyPercent,
      forecastAccuracyTrend: accuracy?.forecastAccuracyTrend,
      forecastError: accuracy?.forecastError,
      forecastReliabilityScore:
        reliability?.forecastReliabilityScore ?? evidencePackage.forecastReliabilityScore,
      forecastReliabilityReason: reliability?.forecastReliabilityReason,
      historicalForecastConsistency: reliability?.historicalForecastConsistency,
      forecastVersion: version?.forecastVersion ?? evidencePackage.forecastVersion,
      priorForecastVersion: version?.priorForecastVersion,
      forecastRevisionReason: version?.forecastRevisionReason,
      forecastDelta: version?.forecastDelta,
      forecastConsensus: consensus?.forecastConsensus ?? evidencePackage.forecastConsensus,
      forecastVarianceToBudget: consensus?.forecastVarianceToBudget,
      forecastVarianceToManagement: consensus?.forecastVarianceToManagement,
      forecastVarianceToBoard: consensus?.forecastVarianceToBoard,
      forecastDriverSensitivity: sensitivity?.forecastDriverSensitivity,
      forecastDriverImpactRank: sensitivity?.forecastDriverImpactRank,
      sensitivityScore: sensitivity?.sensitivityScore ?? evidencePackage.sensitivityScore,
      forecastBiasDirection: bias?.forecastBiasDirection ?? evidencePackage.forecastBiasDirection,
      forecastBiasMagnitude: bias?.forecastBiasMagnitude,
      forecastBiasConfidence: bias?.forecastBiasConfidence,
      seasonalityFactor: seasonality?.seasonalityFactor ?? evidencePackage.seasonalityFactor,
      seasonalityPattern: seasonality?.seasonalityPattern,
      seasonalityConfidence: seasonality?.seasonalityConfidence,
      macroeconomicIndicatorIds:
        macroeconomicContext?.macroeconomicIndicatorIds ?? evidencePackage.macroeconomicIndicatorIds,
      macroeconomicAssumptions: macroeconomicContext?.macroeconomicAssumptions ?? [],
      macroeconomicConfidence: macroeconomicContext?.macroeconomicConfidence,
      forecastReviewStatus: approval?.forecastReviewStatus ?? evidencePackage.forecastReviewStatus,
      forecastApprovalStatus: approval?.forecastApprovalStatus ?? evidencePackage.forecastApprovalStatus,
      forecastApprovalLevel: approval?.forecastApprovalLevel,
      forecastSourceLevel:
        input.granularity?.forecastSourceLevel ?? evidencePackage.forecastSourceLevel,
      forecastRollupLevel:
        input.granularity?.forecastRollupLevel ?? evidencePackage.forecastRollupLevel,
      forecastLineage: input.granularity?.forecastLineage ?? evidencePackage.forecastLineage,
      methodologyId: input.methodology?.methodologyId ?? evidencePackage.methodologyId,
      methodologyCategory: input.methodology?.methodologyCategory ?? evidencePackage.methodologyCategory,
      methodologyConfidence: input.methodology?.methodologyConfidence ?? evidencePackage.methodologyConfidence,
      methodologyReason: input.methodology?.methodologyReason ?? evidencePackage.methodologyReason,
      methodologyLineage: input.methodology?.methodologyLineage ?? evidencePackage.methodologyLineage,
      assumptions,
      drivers,
      risks,
      accuracy,
      reliability,
      version,
      consensus,
      sensitivity,
      bias,
      seasonality,
      macroeconomicContext,
      approval,
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
