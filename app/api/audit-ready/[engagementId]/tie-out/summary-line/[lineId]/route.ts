import { NextResponse } from "next/server";
import { getEngagementActor } from "@/lib/audit-ready/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { getBsAccountTransactions } from "@/lib/audit-ready/tie-out/bs-recon-lines";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ engagementId: string; lineId: string }> },
) {
  const { engagementId, lineId } = await ctx.params;
  const actor = await getEngagementActor(engagementId);
  if (!actor) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  const { data: line, error: lineErr } = await supabase
    .from("audit_ready_bs_recon_summary_lines")
    .select(
      "id, engagement_id, child_run_id, qbo_account_id, is_computed_line",
    )
    .eq("id", lineId)
    .maybeSingle();

  if (lineErr) {
    console.error("[api/summary-line] lookup failed", {
      engagementId,
      lineId,
      error: lineErr,
    });
    return NextResponse.json({ error: "lookup_failed" }, { status: 500 });
  }
  if (!line) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Cross-engagement guard — treat as not found (don't leak existence)
  if (line.engagement_id !== engagementId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (line.is_computed_line || !line.child_run_id || !line.qbo_account_id) {
    return NextResponse.json(
      { error: "no_detail_available" },
      { status: 400 },
    );
  }

  try {
    const { transactions, subledgerSourceUrl } =
      await getBsAccountTransactions(line.child_run_id, line.qbo_account_id);
    return NextResponse.json({ transactions, subledgerSourceUrl });
  } catch (err) {
    console.error("[api/summary-line] txn fetch failed", {
      engagementId,
      lineId,
      error: err,
    });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
}
