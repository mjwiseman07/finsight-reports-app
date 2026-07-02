import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { runVerifier } from "@/lib/checklist-verifiers/registry";
import { finalizeChecklistRun } from "@/lib/checklist-run-finalize";

export async function POST(req, { params }) {
  const supabase = getSupabaseAdmin();
  const closePeriodId = params?.id;
  if (!closePeriodId) {
    return NextResponse.json({ error: "close period id required" }, { status: 400 });
  }

  const { data: period, error: pErr } = await supabase
    .from("close_periods")
    .select("id, firm_client_id, period_start, period_end")
    .eq("id", closePeriodId)
    .single();
  if (pErr || !period) {
    return NextResponse.json(
      { error: pErr?.message || "close period not found" },
      { status: 404 },
    );
  }

  const { data: checklist } = await supabase
    .from("close_checklists")
    .select("*, close_checklist_items(*)")
    .eq("firm_client_id", period.firm_client_id)
    .maybeSingle();

  if (!checklist) {
    await supabase
      .from("close_periods")
      .update({ checklist_status: "skipped_no_checklist" })
      .eq("id", closePeriodId);
    return NextResponse.json({ status: "skipped_no_checklist" });
  }

  const { data: run, error: rErr } = await supabase
    .from("close_checklist_runs")
    .upsert(
      {
        close_period_id: closePeriodId,
        checklist_id: checklist.id,
        run_mode: checklist.run_mode,
        status: "running",
        started_at: new Date().toISOString(),
      },
      { onConflict: "close_period_id" },
    )
    .select()
    .single();
  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  await supabase
    .from("close_periods")
    .update({ checklist_status: "running", checklist_run_id: run.id })
    .eq("id", closePeriodId);

  const items = (checklist.close_checklist_items || [])
    .filter((i) => i.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  const runItems = items.map((i) => ({
    run_id: run.id,
    checklist_item_id: i.id,
    status: "pending",
  }));

  await supabase.from("close_checklist_run_items").delete().eq("run_id", run.id);
  await supabase.from("close_checklist_run_items").insert(runItems);

  if (checklist.run_mode === "auto") {
    const ctx = {
      firmClientId: period.firm_client_id,
      periodStart: period.period_start,
      periodEnd: period.period_end,
      supabase,
    };

    for (const item of items) {
      if (!item.ai_verifier) continue;
      const result = await runVerifier(item.ai_verifier, ctx);
      await supabase
        .from("close_checklist_run_items")
        .update({
          status: result.passed ? "passed" : "failed",
          verified_at: new Date().toISOString(),
          verified_by: "ai",
          note: result.detail,
          ai_result_json: result.raw || null,
        })
        .eq("run_id", run.id)
        .eq("checklist_item_id", item.id);
    }

    const finalStatus = await finalizeChecklistRun(supabase, run.id, closePeriodId);
    return NextResponse.json({ runId: run.id, status: finalStatus });
  }

  return NextResponse.json({ runId: run.id, status: "running" });
}

export async function GET(req, { params }) {
  const supabase = getSupabaseAdmin();
  const closePeriodId = params?.id;
  if (!closePeriodId) {
    return NextResponse.json({ error: "close period id required" }, { status: 400 });
  }

  const { data: run, error } = await supabase
    .from("close_checklist_runs")
    .select("*, close_checklist_run_items(*, close_checklist_items(*))")
    .eq("close_period_id", closePeriodId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ run });
}
