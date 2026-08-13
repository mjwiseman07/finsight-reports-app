// Industry-native "north star" KPI mapping.
// Bound to the treatment libraries shipped in Phase 42 and per-vertical waves.
// See: memory/knowledge/concepts/industry-intelligence-treatment-libraries.md

export type IndustryKey =
  | "SaaS"
  | "Construction"
  | "Healthcare"
  | "Manufacturing"
  | "Retail"
  | "Nonprofit"
  | "Professional Services"
  | "Government Contracting"
  | "Fund Accounting"
  | "General";

export type NorthStarKpi = {
  label: string;
  code: string;
  unit: "currency" | "percent" | "ratio" | "days" | "count";
  helperText: string;
  sourceHint: string;
  computationShipped: boolean;
};

export const INDUSTRY_NORTH_STAR: Record<IndustryKey, NorthStarKpi> = {
  SaaS: {
    label: "MRR / NRR",
    code: "mrr_nrr",
    unit: "currency",
    helperText: "Monthly recurring revenue with net-revenue-retention overlay",
    sourceHint: "subscription ledger + churn/expansion classifiers",
    computationShipped: true,
  },
  Construction: {
    label: "Gross margin per job",
    code: "gross_margin_per_job",
    unit: "percent",
    helperText: "Direct job costing net of materials, labor, subcontracts",
    sourceHint: "job-cost subledger vs. GL revenue by job",
    computationShipped: true,
  },
  Healthcare: {
    label: "Days in AR",
    code: "days_in_ar",
    unit: "days",
    helperText: "Average collection period across payer mix",
    sourceHint: "AR aging schedule + trailing net patient revenue",
    computationShipped: false,
  },
  Manufacturing: {
    label: "Inventory turnover",
    code: "inventory_turnover",
    unit: "ratio",
    helperText: "COGS / average inventory (trailing twelve months)",
    sourceHint: "inventory subledger + income-statement COGS",
    computationShipped: false,
  },
  Retail: {
    label: "Gross margin (SKU-weighted)",
    code: "gross_margin_sku_weighted",
    unit: "percent",
    helperText: "Sell-through-weighted margin across active SKUs",
    sourceHint: "SKU subledger + income-statement revenue/COGS",
    computationShipped: false,
  },
  Nonprofit: {
    label: "Program-expense ratio",
    code: "program_expense_ratio",
    unit: "percent",
    helperText: "Program expenses / total expenses (Form 990 signal)",
    sourceHint: "functional expense breakdown from income statement",
    computationShipped: false,
  },
  "Professional Services": {
    label: "Utilization rate",
    code: "utilization_rate",
    unit: "percent",
    helperText: "Billable hours / capacity across the team",
    sourceHint: "time entries subledger + capacity roster",
    computationShipped: false,
  },
  "Government Contracting": {
    label: "Indirect cost pool coverage",
    code: "indirect_cost_pool_coverage",
    unit: "percent",
    helperText: "DCAA-relevant overhead pool recovery vs. actuals",
    sourceHint: "cost pool ledger + contract billings",
    computationShipped: false,
  },
  "Fund Accounting": {
    label: "Restricted vs. unrestricted position",
    code: "restricted_unrestricted_split",
    unit: "percent",
    helperText: "Percentage of net assets under donor/grant restriction",
    sourceHint: "restricted-fund subledger vs. GL net assets",
    computationShipped: false,
  },
  General: {
    label: "Operating gross margin",
    code: "operating_gross_margin",
    unit: "percent",
    helperText: "Revenue less COGS as a percentage of revenue",
    sourceHint: "income statement rollup",
    computationShipped: true,
  },
};

export function resolveNorthStar(industryType: string | null | undefined): NorthStarKpi {
  const key = (industryType || "General") as IndustryKey;
  return INDUSTRY_NORTH_STAR[key] || INDUSTRY_NORTH_STAR.General;
}
