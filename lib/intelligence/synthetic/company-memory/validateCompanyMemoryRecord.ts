import type { SyntheticCompanyMemoryRecord } from "./types";

export function validateCompanyMemoryRecord(record: SyntheticCompanyMemoryRecord) {
  const errors: string[] = [];
  if (!record.memoryId) errors.push("missing_memoryId");
  if (!record.memoryType) errors.push("missing_memoryType");
  if (!record.memoryStatus) errors.push("missing_memoryStatus");
  if (!record.confidence) errors.push("missing_confidence");
  if (record.memoryFreshnessScore < 0 || record.memoryFreshnessScore > 1) errors.push("invalid_memoryFreshnessScore");
  if (!record.memoryLastConfirmedAt) errors.push("missing_memoryLastConfirmedAt");
  if (!record.memorySourceAuthority) errors.push("missing_memorySourceAuthority");
  if (!record.sourceRefs.length) errors.push("missing_sourceRefs");
  if (record.memoryLineage.memoryId !== record.memoryId) errors.push("lineage_memoryId_mismatch");
  if (record.memoryAudit.memoryId !== record.memoryId) errors.push("audit_memoryId_mismatch");
  if (record.memoryAudit.memoryFreshnessScore !== record.memoryFreshnessScore) errors.push("audit_freshness_mismatch");
  if (record.memoryAudit.memorySourceAuthority !== record.memorySourceAuthority) errors.push("audit_authority_mismatch");
  if (record.memoryType === "recommendation_outcome" && !record.recommendationOutcome) errors.push("missing_recommendationOutcome");
  if (record.memoryType === "advisor_feedback" && !record.advisorFeedback) errors.push("missing_advisorFeedback");
  if (record.memoryType === "entity_alias" && !record.entityAlias) errors.push("missing_entityAlias");
  if (record.memoryType === "threshold_override" && !record.thresholdOverride) errors.push("missing_thresholdOverride");

  return {
    valid: errors.length === 0,
    errors,
  };
}
