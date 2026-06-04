import type { SyntheticExplanationValidationResult, SyntheticMockExplanationOutput, SyntheticExplanationInput, SyntheticExplanationPromptRequest } from "./types";

const unsupportedPatterns = [
  { code: "no_new_recommendations", pattern: /\b(new|create|created)\s+recommendation/i },
  { code: "no_new_signals", pattern: /\b(new|create|created)\s+signal/i },
  { code: "no_new_confidence_scores", pattern: /\bconfidence\s+score\s+(is|should|will)\b/i },
  { code: "no_forecasts", pattern: /\bforecast|projected|will\s+increase|will\s+decrease/i },
  { code: "no_budgets", pattern: /\bbudget\b/i },
  { code: "no_scenarios", pattern: /\bscenario|what-if\b/i },
  { code: "no_kpi_values", pattern: /\bkpi\s+value\b/i },
  { code: "no_financial_calculations", pattern: /\bcalculate|calculated|calculation\b/i },
];

function textForValidation(output: SyntheticMockExplanationOutput) {
  return [output.explanationSummary, ...output.keyDrivers, ...(output.attemptedUnsupportedClaims || [])].join(" ");
}

export function validateExplanationObject(
  input: SyntheticExplanationInput,
  promptRequest: SyntheticExplanationPromptRequest,
  output: SyntheticMockExplanationOutput,
): SyntheticExplanationValidationResult {
  const passedChecks: string[] = [];
  const failedChecks: string[] = [];
  const blockedClaims: string[] = [...(output.attemptedUnsupportedClaims || [])];
  const text = textForValidation(output);

  if (output.claimType === input.claimRegistryEntry.claimType) passedChecks.push("registered_claim_type");
  else failedChecks.push("unregistered_claim_type");

  if (input.claimRegistryEntry.allowedLanguageCategories.includes(output.languageCategory)) passedChecks.push("allowed_language_category");
  else failedChecks.push("disallowed_language_category");

  if (input.actionRegistryEntry.allowedActionTypes.includes(output.actionType)) passedChecks.push("allowed_action_type");
  else failedChecks.push("disallowed_action_type");

  const citationsAllowed = output.citationIds.every((citationId) => promptRequest.allowedCitationIds.includes(citationId));
  if (citationsAllowed) passedChecks.push("known_citations_only");
  else failedChecks.push("unknown_citation");

  if (input.recommendation.recommendationLineage.sourceSignalIds.length && input.recommendation.recommendationLineage.sourceMetricIds.length && input.recommendation.recommendationLineage.evidenceIds.length) {
    passedChecks.push("recommendation_signal_metric_evidence_lineage");
  } else {
    failedChecks.push("missing_recommendation_lineage");
  }

  if (input.recommendation.evidenceIds.length) passedChecks.push("evidence_references_present");
  else failedChecks.push("missing_evidence_references");

  for (const check of unsupportedPatterns) {
    if (check.pattern.test(text)) {
      failedChecks.push(check.code);
      blockedClaims.push(check.code);
    } else {
      passedChecks.push(check.code);
    }
  }

  return {
    valid: failedChecks.length === 0,
    passedChecks,
    failedChecks,
    blockedClaims: [...new Set(blockedClaims)],
  };
}
