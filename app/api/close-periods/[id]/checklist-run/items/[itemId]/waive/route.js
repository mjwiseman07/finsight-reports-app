import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req, { params }) {
  const supabase = getSupabaseAdmin();
  const itemId = params?.itemId;
  if (!itemId) {
    return NextResponse.json({ error: "item id required" }, { status: 400 });
  }

  const { reason } = await req.json();
  if (!reason || reason.trim().length < 3) {
    return NextResponse.json({ error: "reason required" }, { status: 400 });
  }

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
  return NextResponse.json({ item: data });
}
