// lib/audit-ready/tie-out/rollup.ts
//
// Canonical cross-kind rollup query for the tie-out summary surface.
//
// Sourced from audit_ready_tie_out_runs (universal — every shipped kind writes
// here) with LEFT JOINs to the 3 per-kind artifact tables that carry storage
// pointers (bs_account_recon, fa_rollforward, bs_recon_summary).
//
// This is a server-only module — do not import from client components.

import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import type { TieOutKind } from "@/lib/audit-ready/tie-out-kind-classifier";

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

/**
 * The 7 shipped tie-out kinds, in the canonical rollup order used by the UI.
 * Balance-sheet family → working-capital cycles → non-cash asset/liability.
 * Any new kind must be added to this list AND to the classifier.
 */
export const ROLLUP_KIND_ORDER = [
  "bs_recon_summary",
  "bs_account_recon",
  "ar_aging",
  "ap_aging",
  "inventory",
  "grni",
  "fixed_asset_rollforward",
] as const satisfies readonly TieOutKind[];

export type RollupKind = (typeof ROLLUP_KIND_ORDER)[number];

/** Human-readable label per kind — kept in sync with UI copy. */
export const ROLLUP_KIND_LABELS: Record<RollupKind, string> = {
  bs_recon_summary: "Balance Sheet Summary",
  bs_account_recon: "Balance Sheet Accounts",
  ar_aging: "AR Aging",
  ap_aging: "AP Aging",
  inventory: "Inventory",
  grni: "GRNI",
  fixed_asset_rollforward: "Fixed Asset Rollforward",
};

/**
 * One row in the rollup strip.
 * Always has `kind` + `runStatus`; artifact-backed kinds also carry `artifactId`.
 */
export type ReconRollupRow = {
  kind: RollupKind;
  runId: string;
  runStatus: string; // pending | running | completed | failed | partial
  totalsStatus: string | null; // tie | auto_reconcile | review | kickout | failed
  varianceCents: number | null;
  subledgerCents: number | null;
  glCents: number | null;
  completedAt: string | null;
  /** Only populated for bs_account_recon, fa_rollforward, bs_recon_summary. */
  artifactId: string | null;
};

// -----------------------------------------------------------------------------
// Query
// -----------------------------------------------------------------------------

/**
 * Latest tie-out run per kind for (engagementId, periodEnd), joined to the
 * per-kind artifact row when one exists. Returns rows in ROLLUP_KIND_ORDER,
 * omitting kinds that have no run for this period.
 *
 * Sequential per-kind query pattern (not a single distinct-on) because Supabase
 * PostgREST does not support DISTINCT ON. 7 kinds × ~10ms round-trip is
 * acceptable at page load; the alternative (RPC) is scope for a later phase.
 */
export async function getReconRollupByPeriodEnd(params: {
  engagementId: string;
  periodEnd: string;
}): Promise<ReconRollupRow[]> {
  const supabase = getSupabaseAdmin();

  const rows: ReconRollupRow[] = [];
  for (const kind of ROLLUP_KIND_ORDER) {
    const { data: run, error } = await supabase
      .from("audit_ready_tie_out_runs")
      .select(
        "id, tie_out_kind, status, totals_status, totals_variance_cents, subledger_total_cents, gl_total_cents, completed_at",
      )
      .eq("engagement_id", params.engagementId)
      .eq("period_end", params.periodEnd)
      .eq("tie_out_kind", kind)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[recon-rollup] run lookup failed", {
        engagementId: params.engagementId,
        periodEnd: params.periodEnd,
        kind,
        error: error.message,
      });
      continue;
    }
    if (!run?.id) continue;

    const artifactId = await lookupArtifactIdForRun(kind, run.id as string);

    rows.push({
      kind,
      runId: run.id as string,
      runStatus: (run.status as string) || "pending",
      totalsStatus: (run.totals_status as string) || null,
      varianceCents:
        run.totals_variance_cents == null
          ? null
          : Number(run.totals_variance_cents),
      subledgerCents:
        run.subledger_total_cents == null
          ? null
          : Number(run.subledger_total_cents),
      glCents:
        run.gl_total_cents == null ? null : Number(run.gl_total_cents),
      completedAt: (run.completed_at as string) || null,
      artifactId,
    });
  }
  return rows;
}

/**
 * For the 3 artifact-backed kinds, resolve the artifact row id keyed by run_id.
 * Returns null for the 4 run-first kinds (ap/ar/grni/inventory).
 */
async function lookupArtifactIdForRun(
  kind: RollupKind,
  runId: string,
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const table =
    kind === "bs_account_recon"
      ? "audit_ready_bs_recon_artifacts"
      : kind === "fixed_asset_rollforward"
      ? "audit_ready_fa_rollforward_artifacts"
      : kind === "bs_recon_summary"
      ? "audit_ready_bs_recon_summary_artifacts"
      : null;

  if (!table) return null;

  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("run_id", runId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.id) return null;
  return data.id as string;
}
