/**
 * AP Intake L4 assertion registry (runtime mirror of ap_intake_assertion_registry).
 */
export interface AssertionResult {
  status: "pass" | "fail" | "error";
  reason?: string;
  severity?: "HIGH" | "MEDIUM" | "LOW";
  evidence?: unknown;
  thresholds?: unknown;
}

export interface AssertionEvaluator {
  id: string;
  layer: string;
  evaluate: (subject: {
    firm_id: string;
    vendor_id: string;
    version: number;
  }) => Promise<AssertionResult>;
}

const REGISTRY = new Map<string, AssertionEvaluator>();

export function registerAssertion(evaluator: AssertionEvaluator): void {
  REGISTRY.set(evaluator.id, evaluator);
}

export function getAssertion(id: string): AssertionEvaluator | undefined {
  return REGISTRY.get(id);
}

export function listApIntakeAssertions(): AssertionEvaluator[] {
  return [...REGISTRY.values()];
}
