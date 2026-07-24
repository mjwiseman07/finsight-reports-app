import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { computeAgeBucket, type AgeBucket } from "./age-bucket.js";

export type KickoutSourceType = "bs_summary_line" | "pbc_run";
export type ResolutionStatus = "pending" | "resolved" | "escalated";

export type KickoutInvestigation = {
  id: string;
  investigated_at: string;
  investigated_by: string;
  note: string;
  resolution_status: ResolutionStatus;
};

export type KickoutRow = {
  id: string; // synthetic: "bs:{lineId}" or "pbc:{runId}"
  source_type: KickoutSourceType;
  source_id: string;
  engagement_id: string;
  engagement_name: string;
  account_or_kind: string;
  account_type: string | null;
  period_end: string;
  variance_cents: number;
  variance_pct: number | null;
  age_bucket: AgeBucket;
  latest_investigation: KickoutInvestigation | null;
  bs_line_id: string | null;
  pbc_run_id: string | null;
  subledger_source_url: string | null;
};

type EngagementRow = {
  id: string;
  engagement_name: string | null;
  closed_at: string | null;
  audit_period_end: string | null;
};

type ArtifactEmbed = { period_end: string };

type BsLineRow = {
  id: string;
  engagement_id: string;
  qbo_account_id: string | null;
  qbo_account_name: string | null;
  qbo_account_type: string | null;
  tie_variance_cents: number | null;
  ending_balance_cents: number | null;
  gl_ending_balance_cents: number | null;
  summary_artifact_id: string;
  audit_ready_bs_recon_summary_artifacts: ArtifactEmbed | ArtifactEmbed[] | null;
};

type PbcRunRow = {
  id: string;
  engagement_id: string;
  tie_out_kind: string;
  period_end: string | null;
  subledger_total_cents: number | null;
  gl_total_cents: number | null;
  subledger_source_url: string | null;
};

function artifactPeriodEnd(line: BsLineRow): string | null {
  const emb = line.audit_ready_bs_recon_summary_artifacts;
  if (!emb) return null;
  if (Array.isArray(emb)) return emb[0]?.period_end ?? null;
  return emb.period_end ?? null;
}

export async function listKickouts(
  engagementIds: string[],
): Promise<KickoutRow[]> {
  if (engagementIds.length === 0) return [];
  const supabase = getSupabaseAdmin();

  // Schema landmine: column is engagement_name (not name)
  const { data: engagements } = await supabase
    .from("audit_ready_engagements")
    .select("id, engagement_name, closed_at, audit_period_end")
    .in("id", engagementIds);

  const engMap = new Map<string, EngagementRow>();
  for (const e of (engagements ?? []) as EngagementRow[]) {
    engMap.set(e.id, e);
  }

  const { data: investigations } = await supabase
    .from("audit_ready_kickout_investigations")
    .select(
      "id, engagement_id, kickout_source_type, kickout_source_id, investigated_at, investigated_by, note, resolution_status",
    )
    .in("engagement_id", engagementIds)
    .order("investigated_at", { ascending: false });

  const invMap = new Map<string, KickoutInvestigation>();
  for (const inv of investigations ?? []) {
    const key = `${inv.kickout_source_type}:${inv.kickout_source_id}`;
    if (!invMap.has(key)) {
      invMap.set(key, {
        id: inv.id,
        investigated_at: inv.investigated_at,
        investigated_by: inv.investigated_by,
        note: inv.note,
        resolution_status: inv.resolution_status as ResolutionStatus,
      });
    }
  }

  const { data: bsLines } = await supabase
    .from("audit_ready_bs_recon_summary_lines")
    .select(
      `
      id,
      engagement_id,
      qbo_account_id,
      qbo_account_name,
      qbo_account_type,
      tie_variance_cents,
      ending_balance_cents,
      gl_ending_balance_cents,
      summary_artifact_id,
      audit_ready_bs_recon_summary_artifacts!inner(period_end)
    `,
    )
    .in("engagement_id", engagementIds)
    .eq("totals_status", "kickout");

  // Exclude bs_recon_summary rollup — container, not a leaf
  const { data: pbcRuns } = await supabase
    .from("audit_ready_tie_out_runs")
    .select(
      `
      id,
      engagement_id,
      tie_out_kind,
      period_end,
      subledger_total_cents,
      gl_total_cents,
      subledger_source_url
    `,
    )
    .in("engagement_id", engagementIds)
    .eq("totals_status", "kickout")
    .neq("tie_out_kind", "bs_recon_summary");

  const rows: KickoutRow[] = [];

  for (const line of (bsLines ?? []) as BsLineRow[]) {
    const eng = engMap.get(line.engagement_id);
    if (!eng) continue;
    const periodEnd = artifactPeriodEnd(line);
    if (!periodEnd) continue;
    const gl = line.gl_ending_balance_cents ?? 0;
    const variance = line.tie_variance_cents ?? 0;
    const variancePct = gl !== 0 ? (variance / gl) * 100 : null;
    rows.push({
      id: `bs:${line.id}`,
      source_type: "bs_summary_line",
      source_id: line.id,
      engagement_id: line.engagement_id,
      engagement_name: eng.engagement_name ?? "Untitled engagement",
      account_or_kind: line.qbo_account_name ?? "Unknown account",
      account_type: line.qbo_account_type ?? null,
      period_end: periodEnd,
      variance_cents: variance,
      variance_pct: variancePct,
      age_bucket: computeAgeBucket(periodEnd, {
        closed_at: eng.closed_at,
        audit_period_end: eng.audit_period_end,
      }),
      latest_investigation:
        invMap.get(`bs_summary_line:${line.id}`) ?? null,
      bs_line_id: line.id,
      pbc_run_id: null,
      subledger_source_url: null,
    });
  }

  for (const run of (pbcRuns ?? []) as PbcRunRow[]) {
    const eng = engMap.get(run.engagement_id);
    if (!eng) continue;
    if (!run.period_end) continue;
    const subledger = run.subledger_total_cents ?? 0;
    const gl = run.gl_total_cents ?? 0;
    const variance = subledger - gl;
    rows.push({
      id: `pbc:${run.id}`,
      source_type: "pbc_run",
      source_id: run.id,
      engagement_id: run.engagement_id,
      engagement_name: eng.engagement_name ?? "Untitled engagement",
      account_or_kind: humanizeKind(run.tie_out_kind),
      account_type: null,
      period_end: run.period_end,
      variance_cents: variance,
      variance_pct: null,
      age_bucket: computeAgeBucket(run.period_end, {
        closed_at: eng.closed_at,
        audit_period_end: eng.audit_period_end,
      }),
      latest_investigation: invMap.get(`pbc_run:${run.id}`) ?? null,
      bs_line_id: null,
      pbc_run_id: run.id,
      subledger_source_url: run.subledger_source_url,
    });
  }

  rows.sort((a, b) => Math.abs(b.variance_cents) - Math.abs(a.variance_cents));
  return rows;
}

function humanizeKind(kind: string): string {
  const map: Record<string, string> = {
    ap_aging: "AP aging",
    ar_aging: "AR aging",
    inventory: "Inventory",
    fixed_asset_rollforward: "Fixed asset rollforward",
    bs_account_recon: "BS account recon",
    bank_recon: "Bank reconciliation",
    grni: "GRNI",
  };
  return map[kind] ?? kind;
}
