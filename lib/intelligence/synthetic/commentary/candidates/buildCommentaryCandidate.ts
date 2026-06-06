import { stableSnapshotHash } from "../../historical-snapshots";
import {
  SYNTHETIC_COMMENTARY_AUDIENCES,
  SYNTHETIC_COMMENTARY_CATEGORIES,
  SYNTHETIC_COMMENTARY_STYLES,
} from "../constants";
import type { SyntheticCommentaryEvidencePackage } from "../evidence";
import type {
  SyntheticCashConversionCycleIndicator,
  SyntheticCommentaryAudience,
  SyntheticCommentaryBenchmarkReference,
  SyntheticCommentaryBusinessModel,
  SyntheticCommentaryCategory,
  SyntheticCommentaryDomain,
  SyntheticCommentaryLineage,
  SyntheticCommentaryMateriality,
  SyntheticCommentaryMaterialityStatus,
  SyntheticCommentaryRegulatoryReference,
  SyntheticCommentaryRiskIndicator,
  SyntheticCommentaryStyle,
  SyntheticLiquidityIndicator,
  SyntheticWorkingCapitalIndicator,
} from "../types";

export interface SyntheticCommentaryEvidenceSummary {
  evidenceId: string;
  supportingObservationCount: number;
  supportingPatternCount: number;
  supportingMemoryCount: number;
  supportingSourceReferenceCount: number;
  driverReferenceCount: number;
}

export interface SyntheticCommentaryCandidateFocus {
  focusType: string;
  labels: string[];
}

export interface BuildCommentaryCandidateInput {
  companyId: string;
  commentaryCategory: SyntheticCommentaryCategory;
  audience: SyntheticCommentaryAudience;
  style: SyntheticCommentaryStyle;
  periodKey: string;
  comparisonPeriodKey: string;
  evidencePackage: SyntheticCommentaryEvidencePackage | null;
  materiality?: SyntheticCommentaryMateriality;
  domains?: SyntheticCommentaryDomain[];
  businessModels?: SyntheticCommentaryBusinessModel[];
  riskIndicators?: SyntheticCommentaryRiskIndicator[];
  workingCapitalIndicators?: SyntheticWorkingCapitalIndicator[];
  cashConversionCycleIndicators?: SyntheticCashConversionCycleIndicator[];
  liquidityIndicators?: SyntheticLiquidityIndicator[];
  benchmarkReferences?: SyntheticCommentaryBenchmarkReference[];
  regulatoryReferences?: SyntheticCommentaryRegulatoryReference[];
}

export interface SyntheticStructuredCommentaryCandidate {
  commentaryId: string;
  companyId: string;
  commentaryCategory: SyntheticCommentaryCategory;
  audience: SyntheticCommentaryAudience;
  style: SyntheticCommentaryStyle;
  periodKey: string;
  comparisonPeriodKey: string;
  materialityStatus: SyntheticCommentaryMaterialityStatus;
  evidenceId: string;
  evidenceSummary: SyntheticCommentaryEvidenceSummary;
  explanationFocus: SyntheticCommentaryCandidateFocus;
  driverFocus: SyntheticCommentaryCandidateFocus;
  riskFocus: SyntheticCommentaryCandidateFocus;
  workingCapitalFocus: SyntheticCommentaryCandidateFocus;
  domainFocus: SyntheticCommentaryCandidateFocus;
  businessModelFocus: SyntheticCommentaryCandidateFocus;
  supportingObservationIds: string[];
  supportingPatternIds: string[];
  supportingMemoryIds: string[];
  supportingSourceReferenceIds: string[];
  driverReferenceIds: string[];
  confidenceScore: number;
  confidenceReason: string;
  evidenceStrength: SyntheticCommentaryEvidencePackage["evidenceStrength"];
  dataCompletenessScore: number;
  evidencePriorityRank: number;
  evidencePriorityReason: string;
  missingDataFlags: string[];
  staleSourceFlags: string[];
  memoryAlignmentStatus: SyntheticCommentaryEvidencePackage["memoryAlignmentStatus"];
  narrativeDriftDetected: boolean;
  historicalPatternConflict: boolean;
  narrativeHorizon: SyntheticCommentaryEvidencePackage["narrativeHorizon"];
  governanceStatus: SyntheticCommentaryEvidencePackage["governanceStatus"];
  refreshStatus: SyntheticCommentaryEvidencePackage["refreshStatus"];
  lineage: SyntheticCommentaryLineage;
  materiality?: SyntheticCommentaryMateriality;
  domains: SyntheticCommentaryDomain[];
  businessModels: SyntheticCommentaryBusinessModel[];
  riskIndicators: SyntheticCommentaryRiskIndicator[];
  workingCapitalIndicators: SyntheticWorkingCapitalIndicator[];
  cashConversionCycleIndicators: SyntheticCashConversionCycleIndicator[];
  liquidityIndicators: SyntheticLiquidityIndicator[];
  benchmarkReferences: SyntheticCommentaryBenchmarkReference[];
  regulatoryReferences: SyntheticCommentaryRegulatoryReference[];
}

export interface BuildCommentaryCandidateResult {
  candidate: SyntheticStructuredCommentaryCandidate | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function hasSupportingEvidence(evidencePackage: SyntheticCommentaryEvidencePackage): boolean {
  return (
    evidencePackage.supportingObservationIds.length > 0 ||
    evidencePackage.supportingPatternIds.length > 0 ||
    evidencePackage.supportingMemoryIds.length > 0 ||
    evidencePackage.supportingSourceReferenceIds.length > 0 ||
    evidencePackage.driverReferenceIds.length > 0
  );
}

function buildCommentaryId(input: BuildCommentaryCandidateInput): string {
  return `commentary-candidate:${stableSnapshotHash({
    companyId: input.companyId,
    commentaryCategory: input.commentaryCategory,
    audience: input.audience,
    style: input.style,
    periodKey: input.periodKey,
    comparisonPeriodKey: input.comparisonPeriodKey,
    evidenceId: input.evidencePackage?.evidenceId ?? null,
    supportingObservationIds: input.evidencePackage?.supportingObservationIds ?? [],
    supportingPatternIds: input.evidencePackage?.supportingPatternIds ?? [],
    supportingMemoryIds: input.evidencePackage?.supportingMemoryIds ?? [],
    supportingSourceReferenceIds: input.evidencePackage?.supportingSourceReferenceIds ?? [],
    driverReferenceIds: input.evidencePackage?.driverReferenceIds ?? [],
  })}`;
}

function buildEvidenceSummary(
  evidencePackage: SyntheticCommentaryEvidencePackage,
): SyntheticCommentaryEvidenceSummary {
  return {
    evidenceId: evidencePackage.evidenceId,
    supportingObservationCount: evidencePackage.supportingObservationIds.length,
    supportingPatternCount: evidencePackage.supportingPatternIds.length,
    supportingMemoryCount: evidencePackage.supportingMemoryIds.length,
    supportingSourceReferenceCount: evidencePackage.supportingSourceReferenceIds.length,
    driverReferenceCount: evidencePackage.driverReferenceIds.length,
  };
}

function buildFocus(focusType: string, labels: string[]): SyntheticCommentaryCandidateFocus {
  return {
    focusType,
    labels: uniqueSorted(labels),
  };
}

function validateInput(input: BuildCommentaryCandidateInput): string[] {
  const warnings: string[] = [];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!SYNTHETIC_COMMENTARY_CATEGORIES.includes(input.commentaryCategory)) {
    warnings.push("commentaryCategory is not supported.");
  }
  if (!SYNTHETIC_COMMENTARY_AUDIENCES.includes(input.audience)) {
    warnings.push("audience is not supported.");
  }
  if (!SYNTHETIC_COMMENTARY_STYLES.includes(input.style)) {
    warnings.push("style is not supported.");
  }
  if (!hasValue(input.periodKey)) warnings.push("periodKey is required.");
  if (!hasValue(input.comparisonPeriodKey)) warnings.push("comparisonPeriodKey is required.");
  if (!input.evidencePackage) {
    warnings.push("evidencePackage is required.");
    return warnings;
  }
  if (input.evidencePackage.companyId !== input.companyId) {
    warnings.push("evidence package companyId must match input companyId.");
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
  if (!hasValue(input.evidencePackage.evidenceStrength)) {
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

export function buildCommentaryCandidate(
  input: BuildCommentaryCandidateInput,
): BuildCommentaryCandidateResult {
  const warnings = validateInput(input);
  if (warnings.length > 0 || !input.evidencePackage) {
    return {
      candidate: null,
      skipped: true,
      warnings,
    };
  }

  const evidencePackage = input.evidencePackage;
  const domains = input.domains ?? [];
  const businessModels = input.businessModels ?? [];
  const riskIndicators = input.riskIndicators ?? [];
  const workingCapitalIndicators = input.workingCapitalIndicators ?? [];
  const cashConversionCycleIndicators = input.cashConversionCycleIndicators ?? [];
  const liquidityIndicators = input.liquidityIndicators ?? [];
  const driverLabels = evidencePackage.driverReferences.map((driver) => driver.driverLabel);

  return {
    candidate: {
      commentaryId: buildCommentaryId(input),
      companyId: input.companyId,
      commentaryCategory: input.commentaryCategory,
      audience: input.audience,
      style: input.style,
      periodKey: input.periodKey,
      comparisonPeriodKey: input.comparisonPeriodKey,
      materialityStatus: input.materiality?.materialityStatus ?? "unknown",
      evidenceId: evidencePackage.evidenceId,
      evidenceSummary: buildEvidenceSummary(evidencePackage),
      explanationFocus: buildFocus("category_period_evidence", [
        input.commentaryCategory,
        input.periodKey,
        input.comparisonPeriodKey,
      ]),
      driverFocus: buildFocus("driver_references", driverLabels),
      riskFocus: buildFocus(
        "risk_indicators",
        riskIndicators.map((riskIndicator) => riskIndicator.riskIndicator),
      ),
      workingCapitalFocus: buildFocus("working_capital_indicators", [
        ...workingCapitalIndicators,
        ...cashConversionCycleIndicators,
        ...liquidityIndicators,
      ]),
      domainFocus: buildFocus("commentary_domains", domains),
      businessModelFocus: buildFocus("business_models", businessModels),
      supportingObservationIds: evidencePackage.supportingObservationIds,
      supportingPatternIds: evidencePackage.supportingPatternIds,
      supportingMemoryIds: evidencePackage.supportingMemoryIds,
      supportingSourceReferenceIds: evidencePackage.supportingSourceReferenceIds,
      driverReferenceIds: evidencePackage.driverReferenceIds,
      confidenceScore: evidencePackage.confidenceScore,
      confidenceReason: evidencePackage.confidenceReason,
      evidenceStrength: evidencePackage.evidenceStrength,
      dataCompletenessScore: evidencePackage.dataCompletenessScore,
      evidencePriorityRank: evidencePackage.evidencePriorityRank,
      evidencePriorityReason: evidencePackage.evidencePriorityReason,
      missingDataFlags: evidencePackage.missingDataFlags,
      staleSourceFlags: evidencePackage.staleSourceFlags,
      memoryAlignmentStatus: evidencePackage.memoryAlignmentStatus,
      narrativeDriftDetected: evidencePackage.narrativeDriftDetected,
      historicalPatternConflict: evidencePackage.historicalPatternConflict,
      narrativeHorizon: evidencePackage.narrativeHorizon,
      governanceStatus: evidencePackage.governanceStatus,
      refreshStatus: evidencePackage.refreshStatus,
      lineage: evidencePackage.lineage,
      materiality: input.materiality,
      domains,
      businessModels,
      riskIndicators,
      workingCapitalIndicators,
      cashConversionCycleIndicators,
      liquidityIndicators,
      benchmarkReferences: input.benchmarkReferences ?? [],
      regulatoryReferences: input.regulatoryReferences ?? [],
    },
    skipped: false,
    warnings: [],
  };
}
