import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { computeAgeBucket, type AgeBucket } from "./age-bucket";

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

/** Shape returned by audit_ready_latest_bs_kickout_lines RPC */
export type BsKickoutLineRpcRow = {
  id: string;
  engagement_id: string;
  qbo_account_id: string | null;
  qbo_account_name: string | null;
  qbo_account_type: string | null;
  tie_variance_cents: number | null;
  gl_ending_balance_cents: number | null;
  child_run_id: string | null;
  line_created_at: string;
  artifact_id: string;
  period_end: string;
  artifact_created_at: string;
};

/** Shape returned by audit_ready_latest_pbc_kickout_runs RPC */
export type PbcKickoutRunRpcRow = {
  id: string;
  engagement_id: string;
  tie_out_kind: string;
  period_end: string | null;
  subledger_total_cents: number | null;
  gl_total_cents: number | null;
  subledger_source_url: string | null;
  created_at: string | null;
};

/**
 * Pure mapper — exported for unit tests of Fix 1/2/3 contracts
 * (RPC performs DISTINCT ON; this assembles the Inbox union).
 */
export function assembleKickoutRows(params: {
  engagements: EngagementRow[];
  investigations: Array<{
    id: string;
    kickout_source_type: string;
    kickout_source_id: string;
    investigated_at: string;
    investigated_by: string;
    note: string;
    resolution_status: ResolutionStatus;
  }>;
  bsLines: BsKickoutLineRpcRow[];
  pbcRuns: PbcKickoutRunRpcRow[];
}): KickoutRow[] {
  const engMap = new Map<string, EngagementRow>();
  for (const e of params.engagements) engMap.set(e.id, e);

  const invMap = new Map<string, KickoutInvestigation>();
  // Caller must pass investigations latest-first
  for (const inv of params.investigations) {
    const key = `${inv.kickout_source_type}:${inv.kickout_source_id}`;
    if (!invMap.has(key)) {
      invMap.set(key, {
        id: inv.id,
        investigated_at: inv.investigated_at,
        investigated_by: inv.investigated_by,
        note: inv.note,
        resolution_status: inv.resolution_status,
      });
    }
  }

  const rows: KickoutRow[] = [];

  for (const line of params.bsLines) {
    const eng = engMap.get(line.engagement_id);
    if (!eng) continue;
    if (!line.period_end) continue;
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
      period_end: line.period_end,
      variance_cents: variance,
      variance_pct: variancePct,
      age_bucket: computeAgeBucket(line.period_end, {
        closed_at: eng.closed_at,
        audit_period_end: eng.audit_period_end,
      }),
      latest_investigation: invMap.get(`bs_summary_line:${line.id}`) ?? null,
      bs_line_id: line.id,
      pbc_run_id: null,
      subledger_source_url: null,
    });
  }

  for (const run of params.pbcRuns) {
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

/**
 * Client-side DISTINCT ON equivalent for tests (mirrors SQL ORDER BY keys).
 * Production path uses the RPC; this documents Fix 1 contract.
 */
export function dedupeBsKickoutLines(
  lines: BsKickoutLineRpcRow[],
): BsKickoutLineRpcRow[] {
  const sorted = [...lines].sort((a, b) => {
    const eng = a.engagement_id.localeCompare(b.engagement_id);
    if (eng !== 0) return eng;
    const pe = a.period_end.localeCompare(b.period_end);
    if (pe !== 0) return pe;
    const acct = (a.qbo_account_id ?? "").localeCompare(b.qbo_account_id ?? "");
    if (acct !== 0) return acct;
    const art =
      new Date(b.artifact_created_at).getTime() -
      new Date(a.artifact_created_at).getTime();
    if (art !== 0) return art;
    return (
      new Date(b.line_created_at).getTime() -
      new Date(a.line_created_at).getTime()
    );
  });
  const seen = new Set<string>();
  const out: BsKickoutLineRpcRow[] = [];
  for (const row of sorted) {
    const key = `${row.engagement_id}|${row.period_end}|${row.qbo_account_id ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/**
 * Client-side DISTINCT ON + orphan filter for tests (mirrors PBC RPC).
 * Order matches SQL: suppress linked first, then DISTINCT ON latest.
 */
export function dedupePbcKickoutRuns(
  runs: PbcKickoutRunRpcRow[],
  linkedKickoutChildRunIds: Set<string>,
): PbcKickoutRunRpcRow[] {
  const eligible = runs.filter((r) => {
    if (r.tie_out_kind === "bs_recon_summary") return false;
    if (
      r.tie_out_kind === "bs_account_recon" &&
      linkedKickoutChildRunIds.has(r.id)
    ) {
      return false;
    }
    return true;
  });
  const sorted = [...eligible].sort((a, b) => {
    const eng = a.engagement_id.localeCompare(b.engagement_id);
    if (eng !== 0) return eng;
    const kind = a.tie_out_kind.localeCompare(b.tie_out_kind);
    if (kind !== 0) return kind;
    const pe = (a.period_end ?? "").localeCompare(b.period_end ?? "");
    if (pe !== 0) return pe;
    return (
      new Date(b.created_at ?? 0).getTime() -
      new Date(a.created_at ?? 0).getTime()
    );
  });
  const seen = new Set<string>();
  const out: PbcKickoutRunRpcRow[] = [];
  for (const row of sorted) {
    const key = `${row.engagement_id}|${row.tie_out_kind}|${row.period_end ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

export async function listKickouts(
  engagementIds: string[],
): Promise<KickoutRow[]> {
  if (engagementIds.length === 0) return [];
  const supabase = getSupabaseAdmin();

  const { data: engagements } = await supabase
    .from("audit_ready_engagements")
    .select("id, engagement_name, closed_at, audit_period_end")
    .in("id", engagementIds);

  const { data: investigations } = await supabase
    .from("audit_ready_kickout_investigations")
    .select(
      "id, engagement_id, kickout_source_type, kickout_source_id, investigated_at, investigated_by, note, resolution_status",
    )
    .in("engagement_id", engagementIds)
    .order("investigated_at", { ascending: false });

  const { data: bsLinesRaw, error: bsErr } = await supabase.rpc(
    "audit_ready_latest_bs_kickout_lines",
    { p_engagement_ids: engagementIds },
  );
  if (bsErr) {
    console.error("[list-kickouts] BS RPC failed", bsErr);
    throw bsErr;
  }

  const { data: pbcRunsRaw, error: pbcErr } = await supabase.rpc(
    "audit_ready_latest_pbc_kickout_runs",
    { p_engagement_ids: engagementIds },
  );
  if (pbcErr) {
    console.error("[list-kickouts] PBC RPC failed", pbcErr);
    throw pbcErr;
  }

  return assembleKickoutRows({
    engagements: (engagements ?? []) as EngagementRow[],
    investigations: (investigations ?? []) as Array<{
      id: string;
      kickout_source_type: string;
      kickout_source_id: string;
      investigated_at: string;
      investigated_by: string;
      note: string;
      resolution_status: ResolutionStatus;
    }>,
    bsLines: (bsLinesRaw ?? []) as BsKickoutLineRpcRow[],
    pbcRuns: (pbcRunsRaw ?? []) as PbcKickoutRunRpcRow[],
  });
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
