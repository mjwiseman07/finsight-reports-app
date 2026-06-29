/**
 * Phase G7 — external-truth shared types.
 */
import type { InsuranceExtracted } from "../../lib/router/insurance/types";

export type { InsuranceExtracted };

export type ExternalTruthVertical =
  | "saas"
  | "rtl"
  | "hc"
  | "npo"
  | "mfg"
  | "con"
  | "gc"
  | "ps"
  | "fa"
  | "edu"
  | "re"
  | "hos"
  | "log"
  | "ins";

export type ReportingFramework = "us-gaap" | "ifrs" | "ipsas";

export type ValidationTier = "structural" | "numeric" | "narrative";

export type GapSeverity = "low" | "medium" | "high" | "critical";

export type GapClassification =
  | "framework-mismatch"
  | "missing-field"
  | "numeric-drift"
  | "narrative-gap"
  | "comingling-suspect"
  | "fetch-failure"
  | "parse-failure"
  | "missing-router-output"
  | "tolerance-exceeded";

export type TriageDecision =
  | "fix-now"
  | "document-limitation"
  | "defer-to-future"
  | "satisfied"
  | null;

export interface SourceJson {
  schemaVersion: "1.0.0";
  filingId: string;
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  formType: string;
  sourceUrl: string;
  fetchedAt: string;
  sha256: string;
  licenseTerms: string;
  synthesized: boolean;
  manualArchive: boolean;
  notes: string;
  originalSha256?: string;
  prunedSha256?: string;
  pruningRule?: string;
  prunedElements?: string[];
}

export interface NumericFact {
  tag: string;
  label: string;
  value: number;
  unit: string;
  periodEnd: string;
}

export interface LeaseMaturitySchedule {
  year_1: number;
  year_2: number;
  year_3: number;
  year_4: number;
  year_5: number;
  thereafter: number;
  total_undiscounted: number;
  imputed_interest: number;
  present_value: number;
}

export interface ExtractedFiling {
  schemaVersion: "1.0.0";
  filingId: string;
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  entityName: string;
  cik?: string;
  ticker?: string;
  formType: string;
  fiscalYearEnd?: string;
  inventoryMethod?: string;
  numericFacts: NumericFact[];
  narrativeSnippets: string[];
  rawFrameworkSignals: string[];
  tax_status?: string;
  entity_type?: string;
  form990?: {
    partI: Record<string, number | string>;
    partVIII: Record<string, number>;
    partIX: Record<string, number>;
    partX: Record<string, number>;
  };
  expenses?: {
    by_function?: {
      program: number;
      management_general: number;
      fundraising: number;
    };
    by_nature?: Record<string, number>;
    allocation_basis?: string;
  };
  allocation_methodology?: {
    method: string;
    rationale: string;
  };
  service_costs?: {
    by_program: Record<string, number>;
    allocation_basis: string;
  };
  contract_revenue?: {
    contract_asset?: { current: number; noncurrent?: number };
    contract_liability?: { current: number; noncurrent?: number };
    deferred_revenue_rollforward?: {
      beginning_balance: number;
      revenue_deferred: number;
      revenue_recognized: number;
      ending_balance: number;
    };
    revenue_by_category?: Record<string, number>;
    cost_to_obtain?: { capitalized: number; amortization: number };
    transaction_price_allocation?: Array<{ obligation: string; amount: number }>;
    remaining_performance_obligation?: { total: number; within_twelve_months: number };
    variable_consideration?: { constrained_amount: number; constraint_rationale: string };
    principal_or_agent?: "principal" | "agent";
  };
  receivables?: {
    billed: number;
    unbilled: number;
  };
  contract_assets?: {
    opening: number;
    closing: number;
  };
  engagement?: {
    classification: "principal" | "agent";
    indicators: string[];
  };
  revenue?: {
    by_fee_structure: Record<string, number>;
  };
  inventory?: {
    cost_formula?: "FIFO" | "weighted_average" | "LIFO";
    carrying_amounts?: Record<string, number>;
  };
  govcon?: {
    contracts?: {
      by_type: Record<string, number>;
    };
    customer_concentration?: {
      us_government_pct: number;
    };
    cas_coverage?: {
      applicable_standards: string[];
      coverage_type: "full" | "modified" | "exempt";
    };
    backlog?: {
      funded: number;
      unfunded: number;
      option_years?: number;
      horizon_years?: number[];
    };
    unallowable_costs?: {
      identified_categories: string[];
      exclusion_methodology: string;
    };
    indirect_rates?: {
      fringe: number;
      overhead: number;
      ga: number;
      true_up_methodology: string;
    };
  };
  construction?: {
    output_measure?: {
      method: "cost-to-cost" | "units-of-delivery" | "milestones";
      unit_definition?: string;
      unit_progress?: number;
      milestones_defined?: string[];
      milestones_achieved?: string[];
    };
    post_completion?: {
      warranty_obligation: string;
      retainage_balance: number;
      adjustment_history: string;
    };
    contract_balances?: {
      contract_assets: number;
      contract_liabilities: number;
    };
  };
  leases?: {
    asc842?: {
      cost_breakdown?: {
        operating_lease_cost: number;
        variable_lease_cost: number;
        short_term_lease_cost: number;
        sublease_income?: number;
        total_lease_cost: number;
      };
      weighted_averages?: {
        operating: { remaining_term_years: number; discount_rate_pct: number };
        finance: { remaining_term_years: number; discount_rate_pct: number };
      };
      maturity?: {
        operating: LeaseMaturitySchedule;
        finance: LeaseMaturitySchedule;
        balance_sheet?: {
          operating_lease_liability: number;
          finance_lease_liability: number;
        };
      };
    };
    ifrs16?: {
      expense_breakdown?: {
        depreciation_rou_by_class: Record<string, number>;
        interest_on_lease_liabilities: number;
        short_term_lease_expense: number;
        low_value_lease_expense: number;
        variable_lease_payments: number;
        sublease_income?: number;
      };
      maturity?: {
        bands: {
          within_one_year: number;
          one_to_two_years: number;
          two_to_three_years: number;
          three_to_four_years: number;
          four_to_five_years: number;
          beyond_five_years: number;
        };
        total_undiscounted: number;
        lease_liability_carrying_amount: number;
        weighted_average_ibr_pct: number;
        presentation_currency?: string;
      };
      rou_rollforward?: {
        classes: Array<{
          class_name: string;
          opening: number;
          additions: number;
          depreciation: number;
          impairment_losses: number;
          impairment_reversals: number;
          disposals: number;
          fx_translation: number;
          other_movements: number;
          closing: number;
        }>;
        balance_sheet_rou_total: number;
        presentation_currency?: string;
      };
    };
  };
  healthcare_revenue?: {
    asc606?: {
      payor_mix?: {
        payors: Array<{
          class:
            | "medicare_traditional"
            | "medicare_advantage"
            | "medicaid"
            | "managed_care"
            | "self_pay"
            | "other";
          label?: string;
          gross_charges: number;
          contractual_adjustments: number;
          implicit_price_concessions: number;
          net_patient_service_revenue: number;
        }>;
        total_net_patient_service_revenue: number;
      };
      implicit_price_concession?: {
        methodology: "portfolio" | "individual";
        lookback_months: number;
        collection_rates_by_payor: Record<string, number>;
        total_ipc: number;
      };
      allowance_rollforward?: {
        opening_balance: number;
        additions_bad_debt_expense: number;
        write_offs: number;
        recoveries: number;
        closing_balance: number;
        net_patient_service_revenue: number;
      };
    };
    ifrs?: {
      payor_mix?: {
        payors: Array<{ class: string; revenue: number }>;
        total_revenue: number;
      };
      receivables_ecl?: {
        stages: {
          stage_1: { opening: number; closing: number; ecl_12_month: number };
          stage_2: { opening: number; closing: number; ecl_lifetime: number };
          stage_3: { opening: number; closing: number; ecl_lifetime: number };
        };
        forward_looking_inputs: string[];
        total_closing_allowance: number;
        presentation_currency?: string;
      };
    };
  };
  manufacturing_inventory?: {
    asc330?: {
      decomposition?: {
        raw_materials: number;
        work_in_process: number;
        finished_goods: number;
        supplies?: number;
        total_inventories: number;
        costing_method: "FIFO" | "LIFO" | "weighted_average" | "specific_identification";
        lifo_reserve?: number;
        lcm_writedown?: number;
      };
      cogm_rollforward?: {
        beginning_raw_materials: number;
        raw_materials_purchased: number;
        ending_raw_materials: number;
        direct_labor: number;
        manufacturing_overhead: number;
        beginning_wip: number;
        ending_wip: number;
        beginning_finished_goods: number;
        ending_finished_goods: number;
        income_statement_cogs: number;
      };
    };
    ias2?: {
      decomposition?: {
        raw_materials: number;
        work_in_progress: number;
        finished_goods: number;
        merchandise?: number;
        total_inventories: number;
        costing_method: "FIFO" | "weighted_average" | "LIFO";
        nrv_writedown?: number;
        nrv_writedown_reversal?: number;
        work_in_process?: number;
      };
    };
  };
  fund_accounting?: {
    holdings?: {
      top_n: number;
      as_of_date: string;
      entries: Array<{ issuer: string; fair_value: number; pct_of_net_assets: number }>;
    };
    derivatives?: {
      contracts: Array<{
        type: string;
        counterparty: string;
        notional: number;
        fair_value: number;
        expiration: string;
      }>;
    };
    brokerage?: {
      commissions_by_broker: Array<{ broker: string; amount: number }>;
      soft_dollar_arrangements?: string;
    };
    portfolio_turnover?: {
      numerator: number;
      denominator: number;
      methodology: string;
    };
    nav?: {
      net_assets: number;
      shares_outstanding: number;
    };
  };
  education?: {
    jurisdiction?: string;
    revenue?: {
      tuition: number;
      contributions: number;
      auxiliary: number;
    };
    endowment?: {
      total: number;
      with_donor_restrictions: number;
      without_donor_restrictions: number;
      permanently_restricted: number;
      temporarily_restricted: number;
    };
    title_iv?: {
      composite_score: number;
      financial_responsibility_zone: "pass" | "pass-with-watch" | "fail";
    };
    auxiliary_enterprises?: {
      housing: number;
      dining: number;
      athletics: number;
    };
    ipsas_non_exchange?: {
      grant_revenue: number;
      conditions_outstanding: string;
    };
  };
  real_estate?: {
    entityType?: string;
    gaapBasis?: string;
    revenue?: {
      rental: number;
      property_count: number;
    };
    lessor_leases?: {
      operating: number;
      sales_type: number;
      direct_financing: number;
    };
    lessee?: {
      rou_asset: number;
      lease_liability: number;
    };
    investment_property?: {
      fair_value: number;
      carrying_amount: number;
    };
    impairment?: {
      asset_group: string;
      carrying_amount: number;
      fair_value: number;
    };
    held_for_sale?: {
      assets: number;
      liabilities: number;
    };
    real_estate_sales?: {
      full_accrual: number;
      partial_sales: number;
    };
    reit_metrics?: {
      ffo: number;
      affo: number;
      noi: number;
    };
    acquisition?: {
      property_name: string;
      amount: number;
      cap_rate_pct: number;
    };
  };
  hospitality?: {
    franchiseFlag?: boolean;
    casinoFlag?: boolean;
    timeshareFlag?: boolean;
    revenue?: {
      rooms: number;
      food_beverage: number;
      other: number;
      hotel_count: number;
    };
    loyalty_program?: {
      deferred_revenue: number;
      material_right_estimate: number;
    };
    gift_cards?: {
      outstanding: number;
      breakage_estimate: number;
    };
    franchise_fees?: {
      initial: number;
      ongoing: number;
    };
    casino?: {
      base_jackpot_accrual: number;
    };
    timeshare?: {
      revenue: number;
      deferred: number;
    };
    usali?: {
      edition: number;
      departmental_schedules: string[];
    };
  };
  logistics?: {
    revenue?: {
      freight: number;
      fuel_surcharge: number;
    };
    fleet?: {
      tractors: number;
      trailers: number;
    };
    principal_or_agent?: "principal" | "agent";
    bill_and_hold?: {
      enabled: boolean;
      goods_ready: boolean;
      amount: number;
    };
    fuel_hedge?: {
      notional: number;
      fair_value: number;
      effectiveness_pct: number;
    };
    impairment?: {
      asset_group: string;
      carrying_amount: number;
      fair_value: number;
    };
    demurrage_detention?: {
      demurrage: number;
      detention: number;
    };
    terminal_leases?: {
      count: number;
      total_liability: number;
    };
  };
  insurance?: InsuranceExtracted;
}

export interface ExpectedDisclosureTopic {
  topicIdentifier: string;
  reportingFramework: ReportingFramework;
  disclosureSummaryAuthored: string;
}

export interface RouterSurface {
  status: "present" | "partial" | "missing";
  fields: string[];
}

export interface ExpectedFiling {
  schemaVersion: "1.0.0";
  filingId: string;
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  entityName: string;
  topics: ExpectedDisclosureTopic[];
  numericFacts: NumericFact[];
  frameworkBinding: {
    primary: ReportingFramework;
    prohibitsLifo: boolean;
  };
  routerRunAt?: string;
  routerSurfaces?: Record<string, RouterSurface>;
}

export interface GapEntry {
  id: string;
  filingId: string;
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  tier: ValidationTier;
  severity: GapSeverity;
  classification: GapClassification;
  message: string;
  observed: string;
  expected: string;
  triage: TriageDecision;
  triageDecisionSha: string | null;
  triageNote: string | null;
  createdAt: string;
  reclassified_in?: string;
  c7a_sub_commit?: string;
  ifrs_citation?: string;
  framework_non_comingling_note?: string;
  closed_in?: string;
  emitter_path?: string | null;
  verification_fixture?: string;
  citation_resolved?: string;
  closure_mechanism?: string;
  scope_precondition?: string;
  framework_violation_handling?: string;
  framework_substitute_note?: string;
  assertion_hook?: string;
  collapse_step?: boolean;
  lessor_scope?: boolean;
  patched_in?: string;
}

export interface GapRegister {
  version: string;
  schemaVersion: string;
  gaps: GapEntry[];
}

export interface MissingCorpusEntry {
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  filingId: string;
  reason: string;
  attemptedAt: string;
}

export interface MissingCorpus {
  version: string;
  missing: MissingCorpusEntry[];
}

export interface ValidationResult {
  filingId: string;
  passed: boolean;
  gaps: GapEntry[];
}

export interface FilingManifestEntry {
  vertical: ExternalTruthVertical;
  framework: ReportingFramework;
  filingId: string;
  ticker?: string;
  cik?: string;
  formType: string;
  manualArchive?: boolean;
  synthesized?: boolean;
  sourceUrl?: string;
  notes?: string;
}
