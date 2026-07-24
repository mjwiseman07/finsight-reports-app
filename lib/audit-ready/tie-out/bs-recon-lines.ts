import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

/**
 * BsSummaryLine — mirrors audit_ready_bs_recon_summary_lines row shape.
 * Types originate here (data layer) and are re-exported to UI components.
 */
export type BsSummaryLineTotalsStatus =
  | "tie"
  | "auto_reconcile"
  | "review"
  | "kickout"
  | "failed";

export type BsSummaryLineClassification = "Asset" | "Liability" | "Equity";

export type BsSummaryLine = {
  id: string;
  summary_artifact_id: string;
  engagement_id: string;
  run_id: string;
  child_run_id: string | null;
  child_artifact_id: string | null;
  qbo_account_id: string | null;
  qbo_account_name: string;
  qbo_account_type: string | null;
  qbo_account_subtype: string | null;
  classification: BsSummaryLineClassification | string;
  beginning_balance_cents: number;
  ending_balance_cents: number;
  gl_ending_balance_cents: number;
  tie_variance_cents: number;
  activity_count: number;
  totals_status: BsSummaryLineTotalsStatus | string;
  sort_order: number;
  is_computed_line: boolean;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
};

/**
 * BsTransaction — mirrors audit_ready_bs_recon_transactions row shape
 * with DB→UI field mapping:
 *   - name_display (DB) → name (UI)
 *   - running_balance_cents is NOT NULL in DB
 */
export type BsTransaction = {
  ordinal: number;
  txn_date: string | null;
  txn_type: string | null;
  doc_number: string | null;
  name: string | null;
  memo: string | null;
  split_account: string | null;
  debit_cents: number;
  credit_cents: number;
  net_cents: number;
  running_balance_cents: number;
  txn_ref: string | null;
};

/**
 * Load all summary_lines for an artifact, ordered by sort_order ASC.
 * Callers must enforce engagement access before calling (uses service-role).
 */
export async function getBsSummaryLines(
  artifactId: string,
): Promise<BsSummaryLine[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_bs_recon_summary_lines")
    .select("*")
    .eq("summary_artifact_id", artifactId)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[getBsSummaryLines] failed", { artifactId, error });
    throw error;
  }
  return (data ?? []) as BsSummaryLine[];
}

type TxnRow = {
  ordinal: number;
  txn_date: string | null;
  txn_type: string | null;
  doc_number: string | null;
  name_display: string | null;
  memo: string | null;
  split_account: string | null;
  debit_cents: number;
  credit_cents: number;
  net_cents: number;
  running_balance_cents: number;
  txn_ref: string | null;
};

/**
 * Load transactions for a specific summary line (per-account).
 * Keyed on child_run_id from the clicked line — NOT the parent artifact run_id.
 * Also returns subledger_source_url from the child run row (QBO report deep-link).
 */
export async function getBsAccountTransactions(
  childRunId: string,
  qboAccountId: string,
): Promise<{
  transactions: BsTransaction[];
  subledgerSourceUrl: string | null;
}> {
  const supabase = getSupabaseAdmin();
  const [txnsResult, runResult] = await Promise.all([
    supabase
      .from("audit_ready_bs_recon_transactions")
      .select(
        "ordinal, txn_date, txn_type, doc_number, name_display, memo, split_account, debit_cents, credit_cents, net_cents, running_balance_cents, txn_ref",
      )
      .eq("run_id", childRunId)
      .eq("qbo_account_id", qboAccountId)
      .order("ordinal", { ascending: true }),
    supabase
      .from("audit_ready_tie_out_runs")
      .select("subledger_source_url")
      .eq("id", childRunId)
      .maybeSingle(),
  ]);
  if (txnsResult.error) {
    console.error("[getBsAccountTransactions] txns failed", {
      childRunId,
      qboAccountId,
      error: txnsResult.error,
    });
    throw txnsResult.error;
  }
  if (runResult.error) {
    console.error("[getBsAccountTransactions] run lookup failed", {
      childRunId,
      error: runResult.error,
    });
    throw runResult.error;
  }
  const transactions: BsTransaction[] = (
    (txnsResult.data ?? []) as TxnRow[]
  ).map((r) => ({
    ordinal: r.ordinal,
    txn_date: r.txn_date,
    txn_type: r.txn_type,
    doc_number: r.doc_number,
    name: r.name_display,
    memo: r.memo,
    split_account: r.split_account,
    debit_cents: r.debit_cents,
    credit_cents: r.credit_cents,
    net_cents: r.net_cents,
    running_balance_cents: r.running_balance_cents,
    txn_ref: r.txn_ref,
  }));
  return {
    transactions,
    subledgerSourceUrl: runResult.data?.subledger_source_url ?? null,
  };
}
