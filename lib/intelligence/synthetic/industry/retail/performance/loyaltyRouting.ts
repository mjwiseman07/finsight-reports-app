import type { RetailEvaluatorInputs, RetailEvaluatorResult, RetailRouteDecision } from "./types";

export function validateLoyaltyRouting(
  inputs: RetailEvaluatorInputs,
): RetailEvaluatorResult<{ decision: RetailRouteDecision }> {
  if (!inputs.loyalty) {
    return { ok: true, value: { decision: { decision: "DENY", expected: "DENY", reason: "loyalty_input_absent" } } };
  }

  if (inputs.loyalty.optionType === "TIER_STATUS" && inputs.loyalty.sspMethod === "RESIDUAL") {
    return { ok: false, error: "LOYALTY_TIER_STATUS_MISROUTED" };
  }

  if (inputs.context.reportingBasis === "IFRS" && inputs.loyalty.basis !== "IFRS") {
    return { ok: false, error: "LOYALTY_TIER_STATUS_MISROUTED" };
  }
  if (inputs.context.reportingBasis === "US_GAAP" && inputs.loyalty.basis !== "US_GAAP") {
    return { ok: false, error: "LOYALTY_TIER_STATUS_MISROUTED" };
  }

  return {
    ok: true,
    value: { decision: { decision: "ALLOW", expected: "ALLOW", reason: "loyalty_basis_routed" } },
  };
}
