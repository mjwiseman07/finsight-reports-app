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
};

export async function loadRunContext(runId: string): Promise<RunContext> {
  const supabase = getSupabaseAdmin();
  const { data: run, error } = await supabase
    .from("audit_ready_tie_out_runs")
    .select(
      "id, engagement_id, period_start, period_end, tie_out_kind, totals_status, kickout_min_dollar, raw_qbo_payload_jsonb, subledger_total_cents, gl_total_cents, totals_variance_cents, completed_at",
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
  };
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
