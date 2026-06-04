import type { SyntheticExplanationInput, SyntheticExplanationPromptRequest } from "./types";

function allowedCitationIds(input: SyntheticExplanationInput) {
  const recommendation = input.recommendation;
  return [
    recommendation.recommendationId,
    ...recommendation.sourceSignalIds,
    ...recommendation.sourceMetricIds,
    ...recommendation.evidenceIds,
    ...recommendation.calculationTraceIds,
    ...recommendation.rootCauseSignalIds,
  ];
}

export function buildExplanationPrompt(input: SyntheticExplanationInput): SyntheticExplanationPromptRequest {
  return {
    recommendationId: input.recommendation.recommendationId,
    recommendationType: input.recommendation.recommendationType,
    allowedClaimType: input.claimRegistryEntry.claimType,
    allowedLanguageCategories: input.claimRegistryEntry.allowedLanguageCategories,
    allowedActionTypes: input.actionRegistryEntry.allowedActionTypes,
    allowedCitationIds: allowedCitationIds(input),
    instruction: "explain_summarize_rephrase_only",
  };
}
