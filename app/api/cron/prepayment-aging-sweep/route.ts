import { NextResponse } from "next/server";
import { runAgingSweep } from "@/lib/ap-intake/prepayment/service";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: Request) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = createServiceClient();
  const { data: firms, error } = await supabase
    .from("pilot_feature_allowlist")
    .select("firm_id")
    .eq("feature_code", "ap_credit_prepayment")
    .is("revoked_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const uniqueFirmIds = Array.from(new Set((firms ?? []).map((r) => r.firm_id as string)));
  const results: Array<Record<string, unknown>> = [];
  for (const firmId of uniqueFirmIds) {
    try {
      const r = await runAgingSweep({ firmId });
      results.push({ firmId, ...r });
    } catch (e) {
      results.push({ firmId, error: (e as Error).message });
    }
  }
  return NextResponse.json({ scanned: uniqueFirmIds.length, results });
}
