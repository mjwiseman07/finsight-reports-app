/**
 * Phase D6.5 Part 2 — Block 3
 * TypeScript types matching the four Block 3 tables.
 */
export type QuarantineStatus = "open" | "released" | "rejected" | "stale";
export type QuarantineReason =
  | "no_match"
  | "fuzzy_candidate"
  | "bank_change_detected"
  | "multi_signal"
  | "duplicate_detected"
  | "anomaly_detected"
  | "fraud_score_threshold";
export type QuarantineSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface QuarantineRow {
  id: string;
  firm_id: string;
  firm_client_id: string;
  bill_id: string;
  intake_message_id: string;
  quarantine_reason: QuarantineReason;
  originating_signals: Array<{ code: string; severity: string; evidence: unknown }>;
  originating_severity: QuarantineSeverity;
  status: QuarantineStatus;
  fraud_score_at_quarantine: number;
  opened_at: string;
  released_at: string | null;
  released_by_user_id: string | null;
  release_notes: string | null;
}

export interface VendorBankHistoryRow {
  id: string;
  firm_id: string;
  firm_client_id: string;
  vendor_id: string;
  routing_number_last4: string;
  account_number_last4: string;
  account_hash_sha256: string;
  first_observed_at: string;
  last_observed_at: string;
  observation_count: number;
  last_seen_bill_id: string | null;
  actor_user_id: string | null;
}

export interface BookkeeperReleaseAllowlistRow {
  id: string;
  firm_id: string;
  user_id: string;
  scope: "quarantine_release";
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  note: string | null;
}

export interface GateResultRecord {
  gate_id: "qc-01" | "qc-02" | "qc-03" | "qc-04";
  pass: boolean;
  reason: string;
  evidence: Record<string, unknown>;
}

export interface QuarantineReleaseAttemptRow {
  id: string;
  firm_id: string;
  quarantine_id: string;
  bill_id: string;
  actor_user_id: string;
  attempted_at: string;
  attestation_text: string;
  gate_results: GateResultRecord[];
  overall_pass: boolean;
  blocking_gates: string[];
}
