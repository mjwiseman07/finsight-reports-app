import type { RetailEvaluatorInputs, RetailEvaluatorResult, RetailRouteDecision } from "./types";

export function validateGiftCardRouting(
  inputs: RetailEvaluatorInputs,
): RetailEvaluatorResult<{ decision: RetailRouteDecision }> {
  if (!inputs.giftCard) {
    return { ok: true, value: { decision: { decision: "DENY", expected: "DENY", reason: "gift_card_input_absent" } } };
  }

  if (inputs.context.reportingBasis === "IFRS") {
    if (inputs.giftCard.basis !== "IFRS") return { ok: false, error: "GIFT_CARD_ESCHEAT_DOUBLE_COUNT" };
    if ("escheatOverlay" in inputs.giftCard) return { ok: false, error: "GIFT_CARD_ESCHEAT_DOUBLE_COUNT" };
    return {
      ok: true,
      value: { decision: { decision: "ALLOW", expected: "ALLOW", reason: "gift_card_basis_routed" } },
    };
  }

  if (inputs.giftCard.basis !== "US_GAAP") return { ok: false, error: "GIFT_CARD_ESCHEAT_DOUBLE_COUNT" };
  return {
    ok: true,
    value: { decision: { decision: "ALLOW", expected: "ALLOW", reason: "gift_card_basis_routed" } },
  };
}
