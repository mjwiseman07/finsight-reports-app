import type {
  AIPersonaId,
  BaselineJobDescription,
  HireUpRecommendationPayload,
} from "../types";

export interface BuildHireUpInput {
  readonly currentPersonaId: AIPersonaId;
  readonly recommendedPersonaId: AIPersonaId;
  readonly capabilityId: string;
  readonly citationHandles: readonly string[];
  readonly revenueNote: string;
  readonly recommendationId: string;
}

export function buildHireUpRecommendation(input: BuildHireUpInput): HireUpRecommendationPayload {
  return Object.freeze({
    recommendationId: input.recommendationId,
    currentPersonaId: input.currentPersonaId,
    recommendedPersonaId: input.recommendedPersonaId,
    capabilityId: input.capabilityId,
    rationale: `Capability '${input.capabilityId}' is outside ${input.currentPersonaId}'s baseline JD but within ${input.recommendedPersonaId}'s baseline JD per Phase 39 module 3.`,
    citationHandles: Object.freeze([...input.citationHandles]),
    humanFallbackAvailable: true as const,
    revenuePathway: Object.freeze({
      suggestedTier: `${input.recommendedPersonaId}.monthly`,
      note: input.revenueNote,
    }),
  });
}

export function getRevenueNoteForPersona(
  baselineByPersona: ReadonlyMap<AIPersonaId, BaselineJobDescription>,
  personaId: AIPersonaId,
): string {
  const baseline = baselineByPersona.get(personaId);
  if (!baseline) {
    throw new Error(`Missing baseline for persona ${personaId}`);
  }
  return baseline.revenueNote;
}
