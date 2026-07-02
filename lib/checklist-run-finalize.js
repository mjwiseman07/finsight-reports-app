import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function finalizeChecklistRun(supabase, runId, closePeriodId) {
  const { data: finalItems } = await supabase
    .from("close_checklist_run_items")
    .select("status, checklist_item_id, close_checklist_items!inner(is_required)")
    .eq("run_id", runId);

  const anyRequiredFailed = (finalItems || []).some(
    (ri) =>
      ri.close_checklist_items.is_required &&
      !["passed", "manual_confirmed", "waived"].includes(ri.status),
  );
  const finalStatus = anyRequiredFailed ? "failed" : "passed";

  await supabase
    .from("close_checklist_runs")
    .update({ status: finalStatus, completed_at: new Date().toISOString() })
    .eq("id", runId);
  await supabase
    .from("close_periods")
    .update({ checklist_status: finalStatus })
    .eq("id", closePeriodId);

  return finalStatus;
}
