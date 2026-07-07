/**
 * Phase D6.5 Part 2 — Block 4: L5 Multi-Strategy Duplicate Detection types.
 */
export type DuplicateStrategyId =
  | "S1_exact_content_hash"
  | "S2_amount_vendor_date"
  | "S3_invoice_number_vendor"
  | "S4_fuzzy_amount_window";

export type DuplicateSeverity = "HIGH" | "MEDIUM";

export interface DuplicateMatch {
  matched_bill_id: string;
  strategy_id: DuplicateStrategyId;
  confidence: number;
  severity: DuplicateSeverity;
  evidence: Record<string, unknown>;
}

export interface DuplicateSignal {
  code: string;
  severity: string;
  evidence: unknown;
}

export interface DuplicateDetectionResult {
  hits: DuplicateMatch[];
  highSeverityHits: DuplicateMatch[];
  shouldQuarantine: boolean;
  signals: DuplicateSignal[];
}

export interface DuplicateRow {
  id: string;
  firm_id: string;
  firm_client_id: string;
  bill_id: string;
  matched_bill_id: string;
  strategy_id: DuplicateStrategyId;
  confidence: number;
  severity: DuplicateSeverity;
  evidence: Record<string, unknown>;
  detected_at: string;
  quarantined: boolean;
}
