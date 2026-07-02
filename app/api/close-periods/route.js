import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req) {
  const supabase = getSupabaseAdmin();
  const { firmClientId, periodStart, periodEnd, createdByUserId } = await req.json();
  if (!firmClientId || !periodStart || !periodEnd) {
    return NextResponse.json(
      { error: "firmClientId, periodStart, periodEnd required" },
      { status: 400 },
    );
  }
  const { data, error } = await supabase
    .from("close_periods")
    .insert({
      firm_client_id: firmClientId,
      period_start: periodStart,
      period_end: periodEnd,
      status: "prep",
      created_by_user_id: createdByUserId || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ closePeriod: data });
}
