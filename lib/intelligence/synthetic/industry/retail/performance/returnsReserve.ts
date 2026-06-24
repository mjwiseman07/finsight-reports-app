import type { RetailEvaluatorInputs, RetailEvaluatorResult, RetailRouteDecision } from "./types";

export function validateReturnsReserve(
  inputs: RetailEvaluatorInputs,
  returnsRateAmount: number,
): RetailEvaluatorResult<{ decision: RetailRouteDecision }> {
  if (!inputs.returnsReserve) {
    if (returnsRateAmount > 0) {
      return { ok: false, error: "MISSING_RETURNS_RESERVE" };
    }
    return {
      ok: true,
      value: { decision: { decision: "DENY", expected: "DENY", reason: "returns_reserve_input_absent" } },
    };
  }

  const liability = inputs.returnsReserve.refundLiability;
  const asset = inputs.returnsReserve.returnAsset;

  if (liability.presentation !== "GROSS" || asset.presentation !== "GROSS") {
    return { ok: false, error: "RETURNS_NET_PRESENTATION_REJECTED" };
  }

  if (inputs.context.reportingBasis === "IFRS" && liability.basis !== "IFRS") {
    return { ok: false, error: "RETURNS_NET_PRESENTATION_REJECTED" };
  }
  if (inputs.context.reportingBasis === "US_GAAP" && liability.basis !== "US_GAAP") {
    return { ok: false, error: "RETURNS_NET_PRESENTATION_REJECTED" };
  }

  return {
    ok: true,
    value: { decision: { decision: "ALLOW", expected: "ALLOW", reason: "asc606_returns_reserve" } },
  };
}
