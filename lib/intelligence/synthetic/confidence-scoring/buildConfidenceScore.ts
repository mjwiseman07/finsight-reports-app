import type { SyntheticConfidenceFactor, SyntheticConfidenceInputSummary, SyntheticConfidenceScore, SyntheticConfidenceTier } from "../types/confidence";

function clampScore(score: number) {
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

function tierForScore(score: number): SyntheticConfidenceTier {
  if (score >= 0.8) return "high";
  if (score >= 0.55) return "medium";
  return "low";
}

function uniqueCodes(factors: SyntheticConfidenceFactor[]) {
  return [...new Set(factors.map((factor) => factor.code))];
}

export function buildConfidenceScore({
  factors,
  inputSummary,
  baseScore = 0.5,
}: {
  factors: SyntheticConfidenceFactor[];
  inputSummary: SyntheticConfidenceInputSummary;
  baseScore?: number;
}): SyntheticConfidenceScore {
  const score = clampScore(baseScore + factors.reduce((total, factor) => total + factor.factorContribution, 0));
  return {
    score,
    tier: tierForScore(score),
    factors,
    factorContributions: factors,
    explanationCodes: uniqueCodes(factors),
    inputSummary,
  };
}
