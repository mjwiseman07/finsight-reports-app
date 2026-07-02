import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function validate(body) {
  const { pct_threshold, abs_threshold_usd, min_baseline_usd } = body || {};
  if (
    pct_threshold != null &&
    (typeof pct_threshold !== "number" || pct_threshold < 0 || pct_threshold > 500)
  ) {
    return "pct_threshold must be a number between 0 and 500";
  }
  if (abs_threshold_usd != null && (typeof abs_threshold_usd !== "number" || abs_threshold_usd < 0)) {
    return "abs_threshold_usd must be a positive number";
  }
  if (min_baseline_usd != null && (typeof min_baseline_usd !== "number" || min_baseline_usd < 0)) {
    return "min_baseline_usd must be a positive number";
  }
  return null;
}

export async function GET(req, { params }) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("close_packet_variance_config")
    .select("*")
    .eq("firm_id", params.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: data });
}

export async function POST(req, { params }) {
  const supabase = getSupabaseAdmin();
  const body = await req.json();
  const validationError = validate(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
  const { data, error } = await supabase
    .from("close_packet_variance_config")
    .upsert(
      {
        firm_id: params.id,
        firm_client_id: null,
        pct_threshold: body.pct_threshold ?? 10,
        abs_threshold_usd: body.abs_threshold_usd ?? 1000,
        min_baseline_usd: body.min_baseline_usd ?? 100,
      },
      { onConflict: "firm_id" },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ config: data });
}

export async function DELETE(req, { params }) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("close_packet_variance_config")
    .delete()
    .eq("firm_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
