import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req, { params }) {
  const supabase = getSupabaseAdmin();
  const { id: firmClientId } = await params;
  if (!firmClientId) {
    return NextResponse.json({ error: "firm client id required" }, { status: 400 });
  }

  const { data: checklist, error } = await supabase
    .from("close_checklists")
    .select("*, close_checklist_items(*)")
    .eq("firm_client_id", firmClientId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ checklist });
}

export async function POST(req, { params }) {
  const supabase = getSupabaseAdmin();
  const { id: firmClientId } = await params;
  if (!firmClientId) {
    return NextResponse.json({ error: "firm client id required" }, { status: 400 });
  }

  const body = await req.json();
  const { templateId, runMode = "auto" } = body;
  if (!templateId) {
    return NextResponse.json({ error: "templateId required" }, { status: 400 });
  }

  const { data: templateItems, error: tErr } = await supabase
    .from("close_checklist_template_items")
    .select("*")
    .eq("template_id", templateId)
    .order("sort_order");
  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  const { data: checklist, error: cErr } = await supabase
    .from("close_checklists")
    .upsert(
      {
        firm_client_id: firmClientId,
        source_template_id: templateId,
        run_mode: runMode,
      },
      { onConflict: "firm_client_id" },
    )
    .select()
    .single();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const items = templateItems.map((t) => ({
    checklist_id: checklist.id,
    sort_order: t.sort_order,
    code: t.code,
    label: t.label,
    description: t.description,
    category: t.category,
    item_type: t.item_type,
    is_required: t.is_required,
    ai_verifier: t.ai_verifier,
  }));

  await supabase.from("close_checklist_items").delete().eq("checklist_id", checklist.id);
  const { error: iErr } = await supabase.from("close_checklist_items").insert(items);
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });

  return NextResponse.json({ checklist, itemCount: items.length });
}
