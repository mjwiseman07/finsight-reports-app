import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function PATCH(req, { params }) {
  const supabase = getSupabaseAdmin();
  const firmClientId = params?.id;
  if (!firmClientId) {
    return NextResponse.json({ error: "firm client id required" }, { status: 400 });
  }

  const { runMode } = await req.json();
  if (!["auto", "manual"].includes(runMode)) {
    return NextResponse.json({ error: "invalid runMode" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("close_checklists")
    .update({ run_mode: runMode, updated_at: new Date().toISOString() })
    .eq("firm_client_id", firmClientId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ checklist: data });
}
