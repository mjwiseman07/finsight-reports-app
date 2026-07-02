import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runVerifier } from "@/lib/checklist-verifiers/registry";
import { finalizeChecklistRun } from "@/lib/checklist-run-finalize";

export async function POST(req, { params }) {
  const supabase = getSupabaseAdmin();
  const { id: closePeriodId, itemId } = await params;
  if (!closePeriodId || !itemId) {
    return NextResponse.json({ error: "close period id and item id required" }, { status: 400 });
  }

  const { data: period } = await supabase
    .from("close_periods")
    .select("id, firm_client_id, period_start, period_end")
    .eq("id", closePeriodId)
    .single();

  const { data: runItem } = await supabase
    .from("close_checklist_run_items")
    .select("*, close_checklist_items!inner(ai_verifier, is_required)")
    .eq("id", itemId)
    .single();

  if (!period || !runItem) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const verifierCode = runItem.close_checklist_items.ai_verifier;
  if (!verifierCode) {
    return NextResponse.json(
      { error: "no AI verifier configured for this item" },
      { status: 400 },
    );
  }

  const result = await runVerifier(verifierCode, {
    firmClientId: period.firm_client_id,
    periodStart: period.period_start,
    periodEnd: period.period_end,
    supabase,
  });

  const { data, error } = await supabase
    .from("close_checklist_run_items")
    .update({
      status: result.passed ? "passed" : "failed",
      verified_at: new Date().toISOString(),
      verified_by: "ai",
      note: result.detail,
      ai_result_json: result.raw || null,
    })
    .eq("id", itemId)
    .select("*, run_id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let runStatus = null;
  if (data?.run_id && closePeriodId) {
    runStatus = await finalizeChecklistRun(supabase, data.run_id, closePeriodId);
  }

  return NextResponse.json({ item: data, runStatus });
}
