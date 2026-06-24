import type { RetailEvaluatorInputs, RetailEvaluatorResult, RetailRouteDecision } from "./types";

export function validateRimRouting(
  inputs: RetailEvaluatorInputs,
): RetailEvaluatorResult<{ decision: RetailRouteDecision }> {
  if (inputs.context.reportingBasis === "IFRS") {
    const hasUsGaapRim = inputs.inventory.basis === "US_GAAP" && Boolean(inputs.inventory.rim);
    if (hasUsGaapRim) {
      return { ok: false, error: "IFRS_RIM_BRANCH_REJECTED" };
    }
    return { ok: true, value: { decision: { decision: "ALLOW", expected: "ALLOW", reason: "rim_us_gaap_only" } } };
  }

  if (inputs.inventory.basis === "IFRS") {
    return { ok: false, error: "IFRS_LIFO_INPUT_REJECTED" };
  }

  return { ok: true, value: { decision: { decision: "ALLOW", expected: "ALLOW", reason: "rim_us_gaap_only" } } };
}
