import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { finalizeChecklistRun } from "@/lib/checklist-run-finalize";

export async function POST(req, { params }) {
  const supabase = getSupabaseAdmin();
  const closePeriodId = params?.id;
  const itemId = params?.itemId;
  if (!itemId) {
    return NextResponse.json({ error: "item id required" }, { status: 400 });
  }

  const { reason } = await req.json();
  if (!reason || reason.trim().length < 3) {
    return NextResponse.json({ error: "reason required" }, { status: 400 });
  }

  const { data: runItem } = await supabase
    .from("close_checklist_run_items")
    .select("run_id")
    .eq("id", itemId)
    .single();

  const { data, error } = await supabase
    .from("close_checklist_run_items")
    .update({
      status: "waived",
      verified_at: new Date().toISOString(),
      verified_by: "user",
      note: `WAIVED: ${reason}`,
    })
    .eq("id", itemId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let runStatus = null;
  if (runItem?.run_id && closePeriodId) {
    runStatus = await finalizeChecklistRun(supabase, runItem.run_id, closePeriodId);
  }

  return NextResponse.json({ item: data, runStatus });
}
