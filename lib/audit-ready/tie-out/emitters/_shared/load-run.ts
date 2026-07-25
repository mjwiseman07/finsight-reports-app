import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import type { TieOutKind } from "@/lib/audit-ready/tie-out-kind-classifier";

export type RunContext = {
  runId: string;
  engagementId: string;
  engagementName: string;
  periodStart: string | null;
  periodEnd: string;
  tieOutKind: TieOutKind;
  totalsStatus: string | null;
  kickoutMinDollar: number | null;
  rawQboPayload: Record<string, unknown> | null;
  subledgerTotalCents: number | null;
  glTotalCents: number | null;
  totalsVarianceCents: number | null;
  completedAt: string | null;
  regeneratedFromRunId: string | null;
  regeneratedAt: string | null;
};

export async function loadRunContext(runId: string): Promise<RunContext> {
  const supabase = getSupabaseAdmin();
  const { data: run, error } = await supabase
    .from("audit_ready_tie_out_runs")
    .select(
      "id, engagement_id, period_start, period_end, tie_out_kind, totals_status, kickout_min_dollar, raw_qbo_payload_jsonb, subledger_total_cents, gl_total_cents, totals_variance_cents, completed_at, regenerated_from_run_id",
    )
    .eq("id", runId)
    .single();
  if (error || !run) {
    throw new Error(`run_not_found: ${error?.message ?? runId}`);
  }
  const { data: eng } = await supabase
    .from("audit_ready_engagements")
    .select("engagement_name")
    .eq("id", run.engagement_id)
    .maybeSingle();

  let regeneratedAt: string | null = null;
  const parentId = (run.regenerated_from_run_id as string | null) ?? null;
  if (parentId) {
    const { data: parent } = await supabase
      .from("audit_ready_tie_out_runs")
      .select("completed_at, started_at")
      .eq("id", parentId)
      .maybeSingle();
    regeneratedAt =
      (parent?.completed_at as string | null) ??
      (parent?.started_at as string | null) ??
      null;
  }

  const raw = run.raw_qbo_payload_jsonb as Record<string, unknown> | null;
  return {
    runId: run.id as string,
    engagementId: run.engagement_id as string,
    engagementName: (eng?.engagement_name as string) || "Engagement",
    periodStart: (run.period_start as string) || null,
    periodEnd: (run.period_end as string) || "",
    tieOutKind: run.tie_out_kind as TieOutKind,
    totalsStatus: (run.totals_status as string) || null,
    kickoutMinDollar:
      run.kickout_min_dollar == null ? null : Number(run.kickout_min_dollar),
    rawQboPayload: raw,
    subledgerTotalCents:
      run.subledger_total_cents == null
        ? null
        : Number(run.subledger_total_cents),
    glTotalCents:
      run.gl_total_cents == null ? null : Number(run.gl_total_cents),
    totalsVarianceCents:
      run.totals_variance_cents == null
        ? null
        : Number(run.totals_variance_cents),
    completedAt: (run.completed_at as string) || null,
    regeneratedFromRunId: parentId,
    regeneratedAt,
  };
}

export type VarianceRow = {
  entity_kind: string;
  entity_qbo_id: string | null;
  entity_display_name: string | null;
  subledger_amount_cents: number | null;
  gl_amount_cents: number | null;
  variance_cents: number;
  variance_percent: number | null;
  status: string;
  classification_reason: string | null;
};

export async function loadVariances(runId: string): Promise<VarianceRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_tie_out_variances")
    .select(
      "entity_kind, entity_qbo_id, entity_display_name, subledger_amount_cents, gl_amount_cents, variance_cents, variance_percent, status, classification_reason",
    )
    .eq("run_id", runId);
  if (error) throw new Error(`variance_query_failed: ${error.message}`);
  return (data ?? []) as VarianceRow[];
}

export type EvidenceRow = {
  source_qbo_id: string | null;
  source_txn_date: string | null;
  source_doc_number: string | null;
  vendor_ref: string | null;
  total_cents: number | null;
  subtotal_cents: number | null;
  balance_cents: number | null;
  linked_po_ids: string[] | null;
  aging_bucket: string | null;
  age_days_at_run: number | null;
};

export async function loadEvidence(runId: string): Promise<EvidenceRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("audit_ready_tie_out_variance_evidence")
    .select(
      "source_qbo_id, source_txn_date, source_doc_number, vendor_ref, total_cents, subtotal_cents, balance_cents, linked_po_ids, aging_bucket, age_days_at_run",
    )
    .eq("run_id", runId);
  if (error) throw new Error(`evidence_query_failed: ${error.message}`);
  return (data ?? []) as EvidenceRow[];
}

export function sourceDataFromPayload(
  raw: Record<string, unknown> | null,
): {
  qboRealmId: string;
  qboConnectionId: string;
  apiResponseJson: unknown;
  fetchedAt: string;
} {
  return {
    qboRealmId: String(raw?.qbo_realm_id ?? ""),
    qboConnectionId: String(raw?.qbo_connection_id ?? ""),
    apiResponseJson: raw,
    fetchedAt: String(raw?.fetched_at ?? new Date().toISOString()),
  };
}
