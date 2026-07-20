import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { getEngagementActor } from "@/lib/audit-ready/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ engagementId: string; runId: string }> },
) {
  const { engagementId, runId } = await ctx.params;
  const actor = await getEngagementActor(engagementId);
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const supabase = getSupabaseAdmin();
  const { data: run, error: runErr } = await supabase
    .from("audit_ready_tie_out_runs")
    .select("*")
    .eq("id", runId)
    .eq("engagement_id", engagementId)
    .maybeSingle();
  if (runErr) return NextResponse.json({ error: runErr.message }, { status: 500 });
  if (!run) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: variances, error: vErr } = await supabase
    .from("audit_ready_tie_out_variances")
    .select("*")
    .eq("run_id", runId)
    .order("status", { ascending: true })
    .order("variance_cents", { ascending: false });
  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
  return NextResponse.json({ run, variances: variances ?? [] });
}
