/**
 * D3 Historical Learning Engine — shared types.
 */

export type TxnType = "Purchase" | "Bill" | "JournalEntry" | "Invoice" | "Deposit";

export type LearnedLine = {
  txn_type: TxnType;
  txn_id: string;
  txn_date: string; // ISO YYYY-MM-DD
  vendor_id?: string;
  vendor_name?: string;
  customer_id?: string;
  account_id: string;
  account_name?: string;
  amount: number;
  posting_type: "Debit" | "Credit";
  class_id?: string;
};

export interface PatternRecord {
  memory_id: string;
  memory_type: string;
  confidence_score: number | null;
  updated_at: string;
  payload: Record<string, unknown>;
}

export type LearningSource = "history" | "forward";

export interface AccumulatorFlushResult {
  patterns_written: number;
}

export interface Accumulator {
  add(line: LearnedLine): void;
  flush(firmClientId: string, source: LearningSource): Promise<AccumulatorFlushResult>;
}
