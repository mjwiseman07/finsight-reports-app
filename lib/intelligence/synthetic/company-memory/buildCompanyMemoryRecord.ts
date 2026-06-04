import type {
  SyntheticAdvisorFeedback,
  SyntheticCompanyContextMemory,
  SyntheticCompanyMemoryLineage,
  SyntheticCompanyMemoryRecord,
  SyntheticCompanyMemorySourceAuthority,
  SyntheticCompanyMemorySourceRef,
  SyntheticCompanyMemoryStatus,
  SyntheticCompanyMemoryType,
  SyntheticCompanyThresholdOverride,
  SyntheticEntityAlias,
  SyntheticIndustryOverride,
  SyntheticKnownSeasonalityMemory,
  SyntheticOperationalNote,
  SyntheticRecommendationOutcome,
  SyntheticRecurringPatternMemory,
} from "./types";
import { scoreMemoryConfidence } from "./scoreMemoryConfidence";
import { scoreMemoryFreshness } from "./scoreMemoryFreshness";
import { stableMemoryHash } from "./stableMemoryHash";

export function buildCompanyMemoryRecord(input: {
  companyId: string | null;
  memoryType: SyntheticCompanyMemoryType;
  memoryStatus?: SyntheticCompanyMemoryStatus;
  memorySourceAuthority: SyntheticCompanyMemorySourceAuthority;
  sourceRefs: SyntheticCompanyMemorySourceRef[];
  createdAt: string;
  updatedAt?: string;
  asOfPeriodKey: string;
  observedPeriodKeys?: string[];
  memoryLastConfirmedAt?: string;
  version?: number;
  supersedesMemoryId?: string;
  memoryLineage: Omit<SyntheticCompanyMemoryLineage, "memoryId">;
  recurringPattern?: SyntheticRecurringPatternMemory;
  knownSeasonality?: SyntheticKnownSeasonalityMemory;
  entityAlias?: SyntheticEntityAlias;
  advisorFeedback?: SyntheticAdvisorFeedback;
  recommendationOutcome?: SyntheticRecommendationOutcome;
  thresholdOverride?: SyntheticCompanyThresholdOverride;
  operationalNote?: SyntheticOperationalNote;
  industryOverride?: SyntheticIndustryOverride;
  companyContext?: SyntheticCompanyContextMemory;
}): SyntheticCompanyMemoryRecord {
  const payload = {
    recurringPattern: input.recurringPattern,
    knownSeasonality: input.knownSeasonality,
    entityAlias: input.entityAlias,
    advisorFeedback: input.advisorFeedback,
    recommendationOutcome: input.recommendationOutcome,
    thresholdOverride: input.thresholdOverride,
    operationalNote: input.operationalNote,
    industryOverride: input.industryOverride,
    companyContext: input.companyContext,
  };
  const observedPeriodKeys = input.observedPeriodKeys?.length
    ? input.observedPeriodKeys
    : input.sourceRefs.map((ref) => ref.observedPeriodKey).filter((periodKey): periodKey is string => Boolean(periodKey));
  const freshness = scoreMemoryFreshness({
    observedPeriodKeys,
    memoryLastConfirmedAt: input.memoryLastConfirmedAt,
    asOfPeriodKey: input.asOfPeriodKey,
  });
  const confidence = scoreMemoryConfidence({
    observedPeriodCount: freshness.observedPeriodKeys.length,
    sourceRefCount: input.sourceRefs.length,
    memoryFreshnessScore: freshness.memoryFreshnessScore,
    memorySourceAuthority: input.memorySourceAuthority,
    advisorConfirmed: input.memorySourceAuthority === "advisor" || input.memorySourceAuthority === "review_workflow",
    hasSnapshotEvidence: input.sourceRefs.some((ref) => ref.sourceType === "historical_snapshot"),
  });
  const memoryId = stableMemoryHash({
    companyId: input.companyId,
    memoryType: input.memoryType,
    memorySourceAuthority: input.memorySourceAuthority,
    payload,
    sourceRefs: input.sourceRefs,
    version: input.version || 1,
  });
  const memoryLineage: SyntheticCompanyMemoryLineage = {
    ...input.memoryLineage,
    memoryId,
  };
  const payloadHash = stableMemoryHash(payload);
  const sourceHash = stableMemoryHash(input.sourceRefs);
  const updatedAt = input.updatedAt || input.createdAt;

  return {
    memoryId,
    id: memoryId,
    companyId: input.companyId,
    memoryType: input.memoryType,
    recordType: input.memoryType,
    memoryStatus: input.memoryStatus || "active",
    confidence,
    memoryFreshnessScore: freshness.memoryFreshnessScore,
    memoryLastConfirmedAt: freshness.memoryLastConfirmedAt,
    memorySourceAuthority: input.memorySourceAuthority,
    sourceRefs: input.sourceRefs,
    createdAt: input.createdAt,
    updatedAt,
    version: input.version || 1,
    supersedesMemoryId: input.supersedesMemoryId,
    memoryLineage,
    memoryAudit: {
      memoryId,
      recordVersion: input.version || 1,
      createdByProcess: input.memorySourceAuthority === "manual_import" ? "manual_import" : input.memorySourceAuthority === "recommendation_outcome" ? "recommendation_review" : input.memorySourceAuthority === "advisor" || input.memorySourceAuthority === "review_workflow" ? "advisor_review" : "system_observation",
      createdAt: input.createdAt,
      updatedAt,
      memoryLastConfirmedAt: freshness.memoryLastConfirmedAt,
      memoryFreshnessScore: freshness.memoryFreshnessScore,
      memorySourceAuthority: input.memorySourceAuthority,
      sourceHash,
      payloadHash,
      supersedesMemoryId: input.supersedesMemoryId,
      validationWarnings: [],
    },
    recurringPattern: input.recurringPattern,
    knownSeasonality: input.knownSeasonality,
    entityAlias: input.entityAlias,
    advisorFeedback: input.advisorFeedback,
    recommendationOutcome: input.recommendationOutcome,
    thresholdOverride: input.thresholdOverride,
    operationalNote: input.operationalNote,
    industryOverride: input.industryOverride,
    companyContext: input.companyContext,
  };
}
