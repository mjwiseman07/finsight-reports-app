import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req, { params }) {
  const supabase = getSupabaseAdmin();
  const { id: closePeriodId } = await params;
  if (!closePeriodId) {
    return NextResponse.json({ error: "close period id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("close_periods")
    .select("*")
    .eq("id", closePeriodId)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ closePeriod: data });
}
