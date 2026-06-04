import type {
  SyntheticCompanyMemoryConfidence,
  SyntheticCompanyMemoryConfidenceFactor,
  SyntheticCompanyMemorySourceAuthority,
} from "./types";

const sourceAuthorityWeights: Record<SyntheticCompanyMemorySourceAuthority, number> = {
  advisor: 0.3,
  review_workflow: 0.26,
  recommendation_outcome: 0.24,
  historical_snapshot: 0.18,
  manual_import: 0.12,
  system_observation: 0.08,
};

export function scoreMemoryConfidence(input: {
  observedPeriodCount: number;
  sourceRefCount: number;
  memoryFreshnessScore: number;
  memorySourceAuthority: SyntheticCompanyMemorySourceAuthority;
  advisorConfirmed?: boolean;
  conflictingFeedback?: boolean;
  hasSnapshotEvidence?: boolean;
}): SyntheticCompanyMemoryConfidence {
  const factors: SyntheticCompanyMemoryConfidenceFactor[] = [];
  const explanationCodes: string[] = [];

  const historyContribution = input.observedPeriodCount >= 24 ? 0.32 : input.observedPeriodCount >= 12 ? 0.22 : 0.06;
  factors.push({ code: "history_coverage", label: "Observed history coverage", impact: "positive", factorContribution: historyContribution });
  explanationCodes.push(input.observedPeriodCount >= 24 ? "pattern_24_months_observed" : input.observedPeriodCount >= 12 ? "pattern_12_months_observed" : "single_occurrence_only");

  const sourceContribution = Math.min(0.12, input.sourceRefCount * 0.04);
  factors.push({ code: "source_refs", label: "Source references", impact: "positive", factorContribution: sourceContribution });

  const authorityContribution = sourceAuthorityWeights[input.memorySourceAuthority];
  factors.push({ code: "source_authority", label: "Source authority", impact: "positive", factorContribution: authorityContribution });
  explanationCodes.push(`authority_${input.memorySourceAuthority}`);

  const freshnessContribution = Number((input.memoryFreshnessScore * 0.22).toFixed(4));
  factors.push({ code: "freshness", label: "Memory freshness", impact: "positive", factorContribution: freshnessContribution });
  if (input.memoryFreshnessScore >= 0.75) explanationCodes.push("fresh_memory");
  if (input.memoryFreshnessScore < 0.35) explanationCodes.push("stale_memory");

  if (input.advisorConfirmed) {
    factors.push({ code: "advisor_confirmed", label: "Advisor confirmed", impact: "positive", factorContribution: 0.08 });
    explanationCodes.push("advisor_confirmed");
  }

  if (input.hasSnapshotEvidence === false) {
    factors.push({ code: "snapshot_evidence_missing", label: "Snapshot evidence missing", impact: "negative", factorContribution: -0.08 });
    explanationCodes.push("snapshot_evidence_missing");
  }

  if (input.conflictingFeedback) {
    factors.push({ code: "conflicting_feedback", label: "Conflicting feedback present", impact: "negative", factorContribution: -0.16 });
    explanationCodes.push("conflicting_feedback_present");
  }

  const score = Number(Math.max(0, Math.min(1, factors.reduce((total, factor) => total + factor.factorContribution, 0))).toFixed(2));
  const tier = score >= 0.75 ? "high" : score >= 0.45 ? "medium" : "low";

  return {
    score,
    tier,
    factors,
    explanationCodes,
  };
}
