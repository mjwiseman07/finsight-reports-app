import type {
  SyntheticAIExplanationObject,
  SyntheticExplanationClaimRegistryEntry,
  SyntheticExplanationLanguageCategory,
  SyntheticExplanationTone,
  SyntheticRecommendationActionRegistryEntry,
  SyntheticRecommendationActionType,
} from "../types/explanation";
import type { SyntheticRecommendationCandidate } from "../types/recommendation";

export interface SyntheticExplanationInput {
  recommendation: SyntheticRecommendationCandidate;
  claimRegistryEntry: SyntheticExplanationClaimRegistryEntry;
  actionRegistryEntry: SyntheticRecommendationActionRegistryEntry;
  tone?: SyntheticExplanationTone;
  maxSummarySentences?: number;
  createdAt: string;
}

export interface SyntheticExplanationPromptRequest {
  recommendationId: string;
  recommendationType: string;
  allowedClaimType: string;
  allowedLanguageCategories: SyntheticExplanationLanguageCategory[];
  allowedActionTypes: SyntheticRecommendationActionType[];
  allowedCitationIds: string[];
  instruction: "explain_summarize_rephrase_only";
}

export interface SyntheticMockExplanationOutput {
  claimType: string;
  languageCategory: SyntheticExplanationLanguageCategory;
  actionType: SyntheticRecommendationActionType;
  explanationSummary: string;
  keyDrivers: string[];
  citationIds: string[];
  attemptedUnsupportedClaims?: string[];
}

export interface SyntheticExplanationObjectInput {
  explanationInput: SyntheticExplanationInput;
  promptRequest: SyntheticExplanationPromptRequest;
  mockOutput: SyntheticMockExplanationOutput;
  explanationId: string;
}

export interface SyntheticExplanationValidationResult {
  valid: boolean;
  passedChecks: string[];
  failedChecks: string[];
  blockedClaims: string[];
}

export type SyntheticExplanationBuilder = (input: SyntheticExplanationObjectInput) => SyntheticAIExplanationObject;
