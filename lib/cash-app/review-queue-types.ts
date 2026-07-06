export interface TopCandidateSummary {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  invoiceAmount: number;
  invoiceDueDate: string;
  fuzzyPayerNameScore: number;
  amountToleranceScore: number;
  dateProximityScore: number;
  historicalPayerBehaviorScore: number;
  globalPatternScore: number;
  aggregateFeatureScore: number;
}

export interface MatchScoreSummary {
  aggregate_feature_score: number;
  llm_tier_used: "primary" | "toptier" | null;
  llm_confidence: number | null;
  llm_reasoning_excerpt: string | null;
  escalated_to_toptier: boolean;
  final_confidence: number | null;
  verdict: "auto_match_candidate" | "route_to_review" | "no_plausible_candidate" | null;
}

export interface ReviewItemRow {
  id: string;
  payment_id: string;
  firm_id: string;
  company_id: string;
  top_candidates: TopCandidateSummary[];
  status: "pending" | "resolved" | "dismissed";
  resolved_action: "accept" | "reject" | "write_off" | "on_account" | "split" | null;
  resolved_by: string | null;
  resolved_at: string | null;
  write_off_amount: number | null;
  write_off_gl_account_id: string | null;
  on_account_customer_id: string | null;
  split_allocations: { invoiceId: string; amount: number }[] | null;
  created_at: string;
  updated_at: string;
  ar_cash_app_match_scores: MatchScoreSummary[];
}

export type ResolveAction = "accept" | "reject" | "write_off" | "on_account" | "split";
