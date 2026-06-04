import type { SyntheticCompanyMemoryLineage } from "./types";

function uniqueSorted(values: string[] = []): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

export function buildMemoryLineage(input: {
  memoryId: string;
  recommendationIds?: string[];
  signalIds?: string[];
  metricIds?: string[];
  evidenceIds?: string[];
  snapshotIds?: string[];
  industryProfileId?: string;
  industryProfileVersion?: string;
  advisorFeedbackIds?: string[];
  recommendationOutcomeIds?: string[];
}): SyntheticCompanyMemoryLineage {
  return {
    memoryId: input.memoryId,
    recommendationIds: uniqueSorted(input.recommendationIds),
    signalIds: uniqueSorted(input.signalIds),
    metricIds: uniqueSorted(input.metricIds),
    evidenceIds: uniqueSorted(input.evidenceIds),
    snapshotIds: uniqueSorted(input.snapshotIds),
    industryProfileId: input.industryProfileId,
    industryProfileVersion: input.industryProfileVersion,
    advisorFeedbackIds: uniqueSorted(input.advisorFeedbackIds),
    recommendationOutcomeIds: uniqueSorted(input.recommendationOutcomeIds),
  };
}
