import type { RetailEvaluatorInputs, RetailEvaluatorResult, RetailRouteDecision } from "./types";

export function validateStoreCguRouting(
  inputs: RetailEvaluatorInputs,
): RetailEvaluatorResult<{ decision: RetailRouteDecision }> {
  if (!inputs.storeImpairment) {
    return {
      ok: true,
      value: { decision: { decision: "DENY", expected: "DENY", reason: "store_cgu_input_absent" } },
    };
  }

  if (inputs.context.reportingBasis === "IFRS") {
    if (inputs.storeImpairment.basis !== "IFRS") return { ok: false, error: "STORE_CGU_BASIS_MISROUTED" };
  } else if (inputs.storeImpairment.basis !== "US_GAAP") {
    return { ok: false, error: "STORE_CGU_BASIS_MISROUTED" };
  }

  return {
    ok: true,
    value: { decision: { decision: "ALLOW", expected: "ALLOW", reason: "store_cgu_basis_routed" } },
  };
}
