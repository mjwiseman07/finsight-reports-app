import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import {
  requireAuditReadyUser,
  getEngagementActor,
} from "@/lib/audit-ready/server-auth";
import { regenerateRun } from "@/lib/audit-ready/tie-out/regenerate-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/audit-ready/runs/[runId]/regenerate
 * Re-runs the tie-out from live QBO, linking via regenerated_from_run_id.
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ runId: string }> },
) {
  const { runId } = await ctx.params;

  const auth = await requireAuditReadyUser();
  if ("error" in auth) return auth.error;

  const supabase = getSupabaseAdmin();
  const { data: run, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .select("id, engagement_id")
    .eq("id", runId)
    .maybeSingle();

  if (runErr) {
    return NextResponse.json({ error: runErr.message }, { status: 500 });
  }
  if (!run) {
    return NextResponse.json({ error: "run_not_found" }, { status: 404 });
  }

  const actor = await getEngagementActor(run.engagement_id as string);
  if (!actor || !actor.canWrite) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const { newRunId } = await regenerateRun(runId, actor.userId);
    return NextResponse.json({ new_run_id: newRunId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "regenerate_failed";
    if (msg === "run_not_found") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    if (msg === "regenerate_not_supported") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error("[regenerate POST] failed", runId, err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
