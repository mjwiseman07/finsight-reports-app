export type KpiCode =
  | "cash_position"
  | "net_profit_margin"
  | "net_op_cash_flow"
  | "ar_aging"
  | "north_star";

export type Unit = "currency" | "percent" | "ratio" | "days" | "count";

export type ComputationStatus = "computed" | "pending_subledger" | "not_supported";

export type ProvenanceSourcePointer = {
  provider: "xero" | "quickbooks";
  providerFamily: string;
  providerProduct: string;
  sourceReport: string;
  externalEntityId: string;
  externalRecordId: string;
  hierarchyPath: string[];
  section: string;
  reportAmount: number | null;
};

export type FormulaNode =
  | { kind: "sum"; label: string; operands: FormulaNode[] }
  | { kind: "div"; label: string; numerator: FormulaNode; denominator: FormulaNode }
  | { kind: "ref"; label: string; amount: number; source: ProvenanceSourcePointer };

export type CompositionRow = {
  label: string;
  amount: number;
  section: string;
  hierarchyPath: string[];
  source: ProvenanceSourcePointer;
  contribution_pct?: number | null;
};

export type ChainReceipt = {
  event_id: string;
  chain_seq: number;
  company_chain_ordinal: number;
  row_hash: string;
  prev_hash: string | null;
  minted_at: string;
  event_kind: string;
  anchor_status: "anchored" | "pending" | "not_anchored";
  anchor_tsr_url?: string | null;
};

export type AccuracyContract = {
  kpi_code: KpiCode;
  kpi_label: string;
  kpi_value_numeric: number | null;
  kpi_value_display: string;
  unit: Unit;
  period: string;
  computation_status: ComputationStatus;
  formula: FormulaNode | null;
  composition: CompositionRow[];
  totals: {
    total_from_composition: number | null;
    reported_by_provider: number | null;
    variance: number | null;
    variance_note: string | null;
  };
  chain_receipt: ChainReceipt;
  freshness: {
    latest_chain_seq_for_company: number;
    receipt_chain_seq: number;
    is_stale: boolean;
    latest_sync_at: string | null;
  };
  cache: {
    hit: boolean;
    computed_at: string;
  };
};
