import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

/**
 * Strict YYYY-MM-DD parse: ISO regex + Date + toISOString slice must match.
 * Rejects invalid calendar dates (e.g. 2026-02-31) and non-ISO shapes.
 */
export function parseStrictAsOfDate(
  raw: string | undefined | null,
): string | null {
  if (!raw || typeof raw !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  if (d.toISOString().slice(0, 10) !== raw) return null;
  return raw;
}

/** Narrowed row from audit_ready_bs_recon_summary_artifacts (real columns). */
export type BsReconSummaryArtifact = {
  id: string;
  engagement_id: string;
  run_id: string;
  period_start: string;
  period_end: string;
  account_count_total: number;
  account_count_tie: number;
  account_count_auto_reconcile: number;
  account_count_review: number;
  account_count_kickout: number;
  account_count_failed: number;
  assets_ending_cents: number;
  liabilities_ending_cents: number;
  equity_ending_cents: number;
  bs_equation_variance_cents: number;
  bs_equation_status: "tie" | "kickout";
  format: string;
  storage_bucket: string;
  storage_object_key: string;
  sha256: string;
  file_size_bytes: number;
  generated_by: string;
  visibility: string;
  accounting_method: string | null;
  created_at: string;
  created_by_user_id: string | null;
};

/**
 * Load the latest BS recon summary artifact for an engagement + period_end.
 * Prefers canonical run stack (latest completed bs_recon_summary run → artifact
 * by run_id). Falls back to direct legacy period_end lookup.
 */
export async function getBsSummaryArtifactByPeriodEnd(params: {
  engagementId: string;
  periodEnd: string;
}): Promise<BsReconSummaryArtifact | null> {
  try {
    const canonical = await getBsSummaryArtifactByPeriodEndViaRun(params);
    if (canonical) return canonical;
  } catch (err) {
    console.error(
      "[bs-recon-artifacts] canonical run lookup failed; trying legacy",
      {
        engagementId: params.engagementId,
        periodEnd: params.periodEnd,
        error: err instanceof Error ? err.message : String(err),
      },
    );
  }
  // PBC-TIEOUT-4.1.3.b removes this fallback
  return getBsSummaryArtifactByPeriodEndLegacy(params);
}

/** Canonical: latest completed summary run for period → artifact by run_id. */
async function getBsSummaryArtifactByPeriodEndViaRun(params: {
  engagementId: string;
  periodEnd: string;
}): Promise<BsReconSummaryArtifact | null> {
  const supabase = getSupabaseAdmin();
  const { data: run, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .select("id")
    .eq("engagement_id", params.engagementId)
    .eq("period_end", params.periodEnd)
    .eq("tie_out_kind", "bs_recon_summary")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runErr || !run?.id) return null;

  const { data, error } = await supabase
    .from("audit_ready_bs_recon_summary_artifacts")
    .select("*")
    .eq("run_id", run.id as string)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as BsReconSummaryArtifact;
}

// PBC-TIEOUT-4.1.3.b removes this function entirely
async function getBsSummaryArtifactByPeriodEndLegacy(params: {
  engagementId: string;
  periodEnd: string;
}): Promise<BsReconSummaryArtifact | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_bs_recon_summary_artifacts")
    .select("*")
    .eq("engagement_id", params.engagementId)
    .eq("period_end", params.periodEnd)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[bs-recon-artifacts] getBsSummaryArtifactByPeriodEnd failed", {
      engagementId: params.engagementId,
      periodEnd: params.periodEnd,
      error: error.message,
    });
    return null;
  }
  return (data as BsReconSummaryArtifact | null) ?? null;
}
