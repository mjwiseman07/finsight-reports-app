// D6.0 — static rule registry for the vertical rule engine.
//
// Imports the D6 contract from vertical-types (NOT the D0 lib/rules/types.ts).
// This index is the parity source of truth; the DB-side curated_rules_registry
// seed mirrors these 24 rule_ids. D6.1's runner dispatches through RULE_REGISTRY.
import type { RuleContext, RuleResult } from "@/lib/rules/vertical-types";

import * as gen_accrual_reversal_check from "./general/accrual_reversal_check";
import * as gen_gl_mapping_variance_check from "./general/gl_mapping_variance_check";
import * as gen_subledger_tie_check from "./general/subledger_tie_check";
import * as gen_reversing_entry_period_check from "./general/reversing_entry_period_check";
import * as mfg_wip_cutoff_check from "./manufacturing/wip_cutoff_check";
import * as mfg_cogs_variance_check from "./manufacturing/cogs_variance_check";
import * as mfg_inventory_reconciliation_check from "./manufacturing/inventory_reconciliation_check";
import * as mfg_standard_cost_capitalization_check from "./manufacturing/standard_cost_capitalization_check";
import * as mfg_freight_capitalization_check from "./manufacturing/freight_capitalization_check";
import * as mfg_warranty_accrual_check from "./manufacturing/warranty_accrual_check";
import * as mfg_scrap_variance_check from "./manufacturing/scrap_variance_check";
import * as mfg_absorption_check from "./manufacturing/absorption_check";
import * as rtl_inventory_shrink_check from "./retail/inventory_shrink_check";
import * as rtl_cogs_recognition_check from "./retail/cogs_recognition_check";
import * as rtl_gift_card_liability_check from "./retail/gift_card_liability_check";
import * as rtl_sales_returns_reserve_check from "./retail/sales_returns_reserve_check";
import * as rtl_loyalty_reward_liability_check from "./retail/loyalty_reward_liability_check";
import * as rtl_seasonal_markdown_check from "./retail/seasonal_markdown_check";
import * as ps_wip_billable_hours_check from "./professional_services/wip_billable_hours_check";
import * as ps_revenue_percent_complete_check from "./professional_services/revenue_percent_complete_check";
import * as ps_unbilled_receivables_check from "./professional_services/unbilled_receivables_check";
import * as ps_contract_asset_reclass_check from "./professional_services/contract_asset_reclass_check";
import * as ps_project_margin_flag_check from "./professional_services/project_margin_flag_check";
import * as ps_bill_rate_variance_check from "./professional_services/bill_rate_variance_check";

type RuleModule = {
  RULE_ID: string;
  RULE_VERSION: number;
  evaluate: (ctx: RuleContext) => Promise<RuleResult>;
};

const modules: RuleModule[] = [
  gen_accrual_reversal_check,
  gen_gl_mapping_variance_check,
  gen_subledger_tie_check,
  gen_reversing_entry_period_check,
  mfg_wip_cutoff_check,
  mfg_cogs_variance_check,
  mfg_inventory_reconciliation_check,
  mfg_standard_cost_capitalization_check,
  mfg_freight_capitalization_check,
  mfg_warranty_accrual_check,
  mfg_scrap_variance_check,
  mfg_absorption_check,
  rtl_inventory_shrink_check,
  rtl_cogs_recognition_check,
  rtl_gift_card_liability_check,
  rtl_sales_returns_reserve_check,
  rtl_loyalty_reward_liability_check,
  rtl_seasonal_markdown_check,
  ps_wip_billable_hours_check,
  ps_revenue_percent_complete_check,
  ps_unbilled_receivables_check,
  ps_contract_asset_reclass_check,
  ps_project_margin_flag_check,
  ps_bill_rate_variance_check,
];

export const RULE_REGISTRY: Readonly<Record<string, RuleModule>> = Object.freeze(
  Object.fromEntries(modules.map((m) => [m.RULE_ID, m])),
);

export const ALL_RULE_IDS: readonly string[] = Object.freeze(modules.map((m) => m.RULE_ID));
