import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { executePurge } from "@/lib/gap2/purge-executor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

export async function POST(req: Request): Promise<Response> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const { data: due, error } = await supabase
    .from("subscription_purge_schedule")
    .select("id, firm_id, grace_until")
    .eq("status", "scheduled")
    .lte("grace_until", new Date().toISOString())
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!due || due.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const results = [];
  for (const row of due) {
    try {
      results.push(await executePurge(row.id as string));
    } catch (err) {
      results.push({
        schedule_id: row.id,
        firm_id: row.firm_id,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(req: Request): Promise<Response> {
  return POST(req);
}
