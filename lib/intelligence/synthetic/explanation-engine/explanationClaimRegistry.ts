import type { SyntheticExplanationClaimRegistryEntry } from "../types/explanation";

export const explanationClaimRegistry: SyntheticExplanationClaimRegistryEntry[] = [
  {
    claimType: "working_capital_liquidity_review",
    allowedEvidenceTypes: ["recommendation", "signal", "metric", "evidence", "trace", "root_cause"],
    allowedLanguageCategories: ["risk", "observation", "driver", "limitation"],
    disallowedLanguageCategories: ["forecast", "budget", "scenario", "roi", "guarantee", "execution", "prediction"],
  },
  {
    claimType: "margin_structure_review",
    allowedEvidenceTypes: ["recommendation", "signal", "metric", "evidence", "trace"],
    allowedLanguageCategories: ["trend", "risk", "observation", "driver", "limitation"],
    disallowedLanguageCategories: ["forecast", "budget", "scenario", "roi", "guarantee", "execution", "prediction"],
  },
  {
    claimType: "benchmark_gap_review",
    allowedEvidenceTypes: ["recommendation", "signal", "metric", "evidence", "trace"],
    allowedLanguageCategories: ["observation", "driver", "limitation"],
    disallowedLanguageCategories: ["forecast", "budget", "scenario", "roi", "guarantee", "execution", "prediction"],
  },
];

export function getExplanationClaimRegistryEntry(claimType: string) {
  return explanationClaimRegistry.find((entry) => entry.claimType === claimType) || null;
}
