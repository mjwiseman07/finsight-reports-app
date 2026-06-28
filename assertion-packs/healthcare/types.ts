import type { AssertionResult } from "../../scripts/external-truth/assertions/types";
import type { ExtractedFiling } from "../../scripts/external-truth/types";

export interface HealthcarePackSkipped {
  skipped: true;
  pack: string;
  reason: string;
  scope_precondition: string;
  framework_citation?: string;
}

export interface HealthcarePackRan {
  skipped: false;
  pack: string;
  assertions: AssertionResult[];
  outputText: string;
}

export type HealthcarePackOutcome = HealthcarePackSkipped | HealthcarePackRan;

export function packOutputText(outcome: HealthcarePackOutcome): string {
  if (outcome.skipped) {
    return `${outcome.pack}: ${outcome.reason} (${outcome.scope_precondition})`;
  }
  return outcome.outputText;
}

export function scopeSatisfiedAssertion(
  extracted: ExtractedFiling,
  pack: string,
  id: string,
  reason: string,
): AssertionResult {
  return {
    id,
    pack,
    tier: "structural",
    passed: true,
    message: reason,
    classification: "missing-field",
    severity: "high",
  };
}
