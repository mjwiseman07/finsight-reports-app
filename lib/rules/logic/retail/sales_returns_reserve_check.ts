import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";

export const RULE_ID = "rtl.sales_returns_reserve_check";
export const RULE_VERSION = 1;

export async function evaluate(_ctx: RuleContext): Promise<RuleResult> {
  return {
    fired: false,
    outcome: "not_implemented",
    reason_code: "stub",
    reason_detail: {},
  };
}
