import { describe, it, expect } from "vitest";
import { ALL_RULE_IDS, RULE_REGISTRY } from "@/lib/rules/logic";

const EXPECTED_D6_0_RULE_IDS = [
  "gen.accrual_reversal_check",
  "gen.gl_mapping_variance_check",
  "gen.subledger_tie_check",
  "gen.reversing_entry_period_check",
  "mfg.wip_cutoff_check",
  "mfg.cogs_variance_check",
  "mfg.inventory_reconciliation_check",
  "mfg.standard_cost_capitalization_check",
  "mfg.freight_capitalization_check",
  "mfg.warranty_accrual_check",
  "mfg.scrap_variance_check",
  "mfg.absorption_check",
  "rtl.inventory_shrink_check",
  "rtl.cogs_recognition_check",
  "rtl.gift_card_liability_check",
  "rtl.sales_returns_reserve_check",
  "rtl.loyalty_reward_liability_check",
  "rtl.seasonal_markdown_check",
  "ps.wip_billable_hours_check",
  "ps.revenue_percent_complete_check",
  "ps.unbilled_receivables_check",
  "ps.contract_asset_reclass_check",
  "ps.project_margin_flag_check",
  "ps.bill_rate_variance_check",
] as const;

// D6.2a implemented these 4 general rules with real QBO/memory logic, so they
// no longer return the not_implemented stub outcome. All others remain stubs.
const IMPLEMENTED_RULE_IDS = new Set<string>([
  "gen.subledger_tie_check",
  "gen.gl_mapping_variance_check",
  "gen.accrual_reversal_check",
  "gen.reversing_entry_period_check",
]);

describe("D6.0 rule registry parity", () => {
  it("exports exactly the 24 expected D6.0 rule_ids", () => {
    expect([...ALL_RULE_IDS].sort()).toEqual([...EXPECTED_D6_0_RULE_IDS].sort());
  });

  it("every RULE_ID matches its module export key", () => {
    for (const id of ALL_RULE_IDS) {
      expect(RULE_REGISTRY[id].RULE_ID).toBe(id);
    }
  });

  it("every module is version 1", () => {
    for (const id of ALL_RULE_IDS) {
      expect(RULE_REGISTRY[id].RULE_VERSION).toBe(1);
    }
  });

  it("every stub (non-implemented rule) returns not_implemented", async () => {
    for (const id of ALL_RULE_IDS) {
      if (IMPLEMENTED_RULE_IDS.has(id)) continue;
      const result = await RULE_REGISTRY[id].evaluate({
        firmClientId: "71111111-1111-4111-8111-111111111111",
        companyId: "test-company",
        industryVertical: "general",
        accountingMethod: "accrual",
        targetType: "transaction",
        targetRef: "test",
        inputs: {},
        inputsHash: "test",
        qbo: null,
      });
      expect(result.fired).toBe(false);
      expect(result.outcome).toBe("not_implemented");
      expect(result.reason_code).toBe("stub");
    }
  });
});
