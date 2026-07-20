import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { getEngagementActor } from "@/lib/audit-ready/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ engagementId: string }> },
) {
  const { engagementId } = await ctx.params;
  const actor = await getEngagementActor(engagementId);
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("audit_ready_tie_out_summary")
    .select("*")
    .eq("engagement_id", engagementId)
    .order("request_number", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const counts: Record<string, number> = {};
  const kindCounts: Record<string, number> = {};
  for (const r of rows || []) {
    counts[r.tie_out_state as string] = (counts[r.tie_out_state as string] || 0) + 1;
    const k = (r.tie_out_kind as string) || "not_yet_classified";
    kindCounts[k] = (kindCounts[k] || 0) + 1;
  }
  return NextResponse.json({
    engagement_id: engagementId,
    total: (rows || []).length,
    state_counts: counts,
    kind_counts: kindCounts,
    rows,
  });
}
