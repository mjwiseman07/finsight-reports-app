import { stableSnapshotHash } from "../../historical-snapshots";
import type { SyntheticStructuredCommandCenterSurfaceCandidate } from "../surface-candidates";

export type SyntheticCommandCenterExecutiveSummaryRequiredSection =
  | "company_health"
  | "cash_summary"
  | "attention_required"
  | "decisions_needed"
  | "top_changes";

export type SyntheticCommandCenterExecutiveSummaryOptionalSection =
  | "forecast_summary"
  | "top_risks"
  | "top_opportunities"
  | "watchlist_changes"
  | "briefing_highlights"
  | "memory_context"
  | "outcome_context"
  | "industry_context";

export interface SyntheticCommandCenterExecutiveSummarySection {
  sectionKey:
    | SyntheticCommandCenterExecutiveSummaryRequiredSection
    | SyntheticCommandCenterExecutiveSummaryOptionalSection;
  surfaceCandidateIds: string[];
}

export interface BuildCommandCenterExecutiveSummaryInput {
  companyId: string;
  summaryKey: string;
  surfaceCandidates: SyntheticStructuredCommandCenterSurfaceCandidate[];
  requiredSections: SyntheticCommandCenterExecutiveSummarySection[];
  optionalSections?: SyntheticCommandCenterExecutiveSummarySection[];
}

export interface SyntheticCommandCenterExecutiveSummary {
  executiveSummaryId: string;
  companyId: string;
  summaryKey: string;
  requiredSections: SyntheticCommandCenterExecutiveSummarySection[];
  optionalSections: SyntheticCommandCenterExecutiveSummarySection[];
  surfaceCandidates: SyntheticStructuredCommandCenterSurfaceCandidate[];
  surfaceCandidateIds: string[];
  prioritizationPackageIds: string[];
  evidencePackageIds: string[];
  commandCenterCandidateIds: string[];
  evidenceReferenceIds: string[];
  trustReferenceIds: string[];
  confidenceReferenceIds: string[];
  degradationReferenceIds: string[];
  recoveryReferenceIds: string[];
  governanceReferenceIds: string[];
  memoryReferenceIds: string[];
  outcomeReferenceIds: string[];
  attentionReferenceIds: string[];
  decisionReferenceIds: string[];
  healthReferenceIds: string[];
  cashReferenceIds: string[];
  whyNowReferenceIds: string[];
  warnings: string[];
}

export interface BuildCommandCenterExecutiveSummaryResult {
  executiveSummary: SyntheticCommandCenterExecutiveSummary | null;
  skipped: boolean;
  warnings: string[];
}

const REQUIRED_SECTIONS: SyntheticCommandCenterExecutiveSummaryRequiredSection[] = [
  "company_health",
  "cash_summary",
  "attention_required",
  "decisions_needed",
  "top_changes",
];

const OPTIONAL_SECTIONS: SyntheticCommandCenterExecutiveSummaryOptionalSection[] = [
  "forecast_summary",
  "top_risks",
  "top_opportunities",
  "watchlist_changes",
  "briefing_highlights",
  "memory_context",
  "outcome_context",
  "industry_context",
];

const MAX_PRIMARY_SUMMARY_SECTIONS = 5;
const MAX_ATTENTION_ITEMS = 5;
const MAX_DECISIONS = 5;
const MAX_RISKS = 5;
const MAX_OPPORTUNITIES = 5;
const MAX_WATCHLIST_CHANGES = 5;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function uniqueStable(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function getSection(
  sections: SyntheticCommandCenterExecutiveSummarySection[],
  sectionKey: SyntheticCommandCenterExecutiveSummarySection["sectionKey"],
): SyntheticCommandCenterExecutiveSummarySection | undefined {
  return sections.find((section) => section.sectionKey === sectionKey);
}

function getSectionCount(
  sections: SyntheticCommandCenterExecutiveSummarySection[],
  sectionKey: SyntheticCommandCenterExecutiveSummarySection["sectionKey"],
): number {
  return getSection(sections, sectionKey)?.surfaceCandidateIds.length ?? 0;
}

function buildExecutiveSummaryId(input: BuildCommandCenterExecutiveSummaryInput): string {
  const optionalSections = input.optionalSections ?? [];

  return `command-center-executive-summary:${stableSnapshotHash({
    companyId: input.companyId,
    summaryKey: input.summaryKey,
    requiredSections: input.requiredSections.map((section) => ({
      sectionKey: section.sectionKey,
      surfaceCandidateIds: section.surfaceCandidateIds,
    })),
    optionalSections: optionalSections.map((section) => ({
      sectionKey: section.sectionKey,
      surfaceCandidateIds: section.surfaceCandidateIds,
    })),
    surfaceCandidateIds: input.surfaceCandidates.map((candidate) => candidate.surfaceCandidateId),
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

function getDecisionReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates.flatMap((candidate) => candidate.prioritizationPackage.decisionQueueCompatibility?.decisionQueueEvidenceIds ?? []),
  );
}

function getHealthReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates
      .filter((candidate) => candidate.surfaceArtifactCategory === "health_item")
      .flatMap((candidate) => candidate.prioritizationPackage.evidencePackage.evidence.evidenceIds),
  );
}

function getCashReferenceIds(candidates: SyntheticStructuredCommandCenterSurfaceCandidate[]): string[] {
  return uniqueStable(
    candidates
      .filter((candidate) => candidate.surfaceArtifactCategory === "cash_item")
      .flatMap((candidate) => candidate.prioritizationPackage.evidencePackage.evidence.evidenceIds),
  );
}

function validateInput(input: BuildCommandCenterExecutiveSummaryInput): string[] {
  const warnings: string[] = [];
  const optionalSections = input.optionalSections ?? [];
  const allSections = [...input.requiredSections, ...optionalSections];

  if (!hasValue(input.companyId)) warnings.push("companyId is required.");
  if (!hasValue(input.summaryKey)) warnings.push("summaryKey is required.");
  if (!Array.isArray(input.surfaceCandidates)) warnings.push("surfaceCandidates must be an array.");
  if (!Array.isArray(input.requiredSections)) warnings.push("requiredSections must be an array.");
  if (!Array.isArray(optionalSections)) warnings.push("optionalSections must be an array.");

  if (warnings.length > 0) return warnings;

  for (const sectionKey of REQUIRED_SECTIONS) {
    const section = getSection(input.requiredSections, sectionKey);
    if (!section) warnings.push(`${sectionKey} required section is missing.`);
  }

  for (const section of input.requiredSections) {
    if (!REQUIRED_SECTIONS.includes(section.sectionKey as SyntheticCommandCenterExecutiveSummaryRequiredSection)) {
      warnings.push(`${section.sectionKey} is not an approved required section.`);
    }
  }

  for (const section of optionalSections) {
    if (!OPTIONAL_SECTIONS.includes(section.sectionKey as SyntheticCommandCenterExecutiveSummaryOptionalSection)) {
      warnings.push(`${section.sectionKey} is not an approved optional section.`);
    }
  }

  if (input.requiredSections.length > MAX_PRIMARY_SUMMARY_SECTIONS) {
    warnings.push("requiredSections exceeds the approved 5-section summary limit.");
  }
  if (getSectionCount(input.requiredSections, "attention_required") > MAX_ATTENTION_ITEMS) {
    warnings.push("attention_required exceeds the approved 5-item limit.");
  }
  if (getSectionCount(input.requiredSections, "decisions_needed") > MAX_DECISIONS) {
    warnings.push("decisions_needed exceeds the approved 5-item limit.");
  }
  if (getSectionCount(optionalSections, "top_risks") > MAX_RISKS) {
    warnings.push("top_risks exceeds the approved 5-item limit.");
  }
  if (getSectionCount(optionalSections, "top_opportunities") > MAX_OPPORTUNITIES) {
    warnings.push("top_opportunities exceeds the approved 5-item limit.");
  }
  if (getSectionCount(optionalSections, "watchlist_changes") > MAX_WATCHLIST_CHANGES) {
    warnings.push("watchlist_changes exceeds the approved 5-item limit.");
  }

  for (const candidate of input.surfaceCandidates) {
    if (!hasValue(candidate.surfaceCandidateId)) warnings.push("surfaceCandidateId is required.");
    if (candidate.companyId !== input.companyId) {
      warnings.push("surface candidate companyId must match input companyId.");
    }
  }

  const availableSurfaceCandidateIds = new Set(input.surfaceCandidates.map((candidate) => candidate.surfaceCandidateId));
  for (const section of allSections) {
    for (const surfaceCandidateId of section.surfaceCandidateIds) {
      if (!availableSurfaceCandidateIds.has(surfaceCandidateId)) {
        warnings.push(`${section.sectionKey} references an unknown surface candidate.`);
      }
    }
  }

  return warnings;
}

export function buildCommandCenterExecutiveSummary(
  input: BuildCommandCenterExecutiveSummaryInput,
): BuildCommandCenterExecutiveSummaryResult {
  const warnings = validateInput(input);
  if (warnings.length > 0) {
    return {
      executiveSummary: null,
      skipped: true,
      warnings,
    };
  }

  const optionalSections = input.optionalSections ?? [];

  return {
    executiveSummary: {
      executiveSummaryId: buildExecutiveSummaryId(input),
      companyId: input.companyId,
      summaryKey: input.summaryKey,
      requiredSections: input.requiredSections,
      optionalSections,
      surfaceCandidates: input.surfaceCandidates,
      surfaceCandidateIds: input.surfaceCandidates.map((candidate) => candidate.surfaceCandidateId),
      prioritizationPackageIds: input.surfaceCandidates.map((candidate) => candidate.prioritizationPackageId),
      evidencePackageIds: input.surfaceCandidates.map((candidate) => candidate.evidencePackageId),
      commandCenterCandidateIds: input.surfaceCandidates.map((candidate) => candidate.commandCenterCandidateId),
      evidenceReferenceIds: getEvidenceReferenceIds(input.surfaceCandidates),
      trustReferenceIds: getTrustReferenceIds(input.surfaceCandidates),
      confidenceReferenceIds: getConfidenceReferenceIds(input.surfaceCandidates),
      degradationReferenceIds: getDegradationReferenceIds(input.surfaceCandidates),
      recoveryReferenceIds: getRecoveryReferenceIds(input.surfaceCandidates),
      governanceReferenceIds: getGovernanceReferenceIds(input.surfaceCandidates),
      memoryReferenceIds: uniqueStable(input.surfaceCandidates.flatMap((candidate) => candidate.memoryReferenceIds)),
      outcomeReferenceIds: uniqueStable(input.surfaceCandidates.flatMap((candidate) => candidate.outcomeReferenceIds)),
      attentionReferenceIds: getAttentionReferenceIds(input.surfaceCandidates),
      decisionReferenceIds: getDecisionReferenceIds(input.surfaceCandidates),
      healthReferenceIds: getHealthReferenceIds(input.surfaceCandidates),
      cashReferenceIds: getCashReferenceIds(input.surfaceCandidates),
      whyNowReferenceIds: uniqueStable(input.surfaceCandidates.flatMap((candidate) => candidate.whyNowReasons)),
      warnings: [],
    },
    skipped: false,
    warnings: [],
  };
}
