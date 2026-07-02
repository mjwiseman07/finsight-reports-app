import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req) {
  const supabase = getSupabaseAdmin();
  const url = new URL(req.url);
  const firmId = url.searchParams.get("firmId");

  let q = supabase
    .from("close_checklist_templates")
    .select("*, close_checklist_template_items(*)")
    .order("name");

  if (firmId) {
    q = q.or(`is_system.eq.true,firm_id.eq.${firmId}`);
  } else {
    q = q.eq("is_system", true);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ templates: data });
}
