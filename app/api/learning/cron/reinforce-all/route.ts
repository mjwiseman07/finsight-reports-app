import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { reinforceFromPostedJEs } from "@/lib/learning/forward-learner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_secret_not_configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: clients, error } = await supabase
    .from("firm_clients")
    .select("id")
    .not("owner_user_id", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results: Array<{ firm_client_id: string; ok: boolean; detail?: unknown }> = [];
  for (const client of clients ?? []) {
    try {
      const r = await reinforceFromPostedJEs(client.id as string);
      results.push({ firm_client_id: client.id as string, ok: true, detail: r });
    } catch (err) {
      results.push({
        firm_client_id: client.id as string,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
