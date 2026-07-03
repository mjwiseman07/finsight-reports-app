import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security.js";
import { runHistoricalScan } from "@/lib/learning/qbo-scanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const access = (await resolveSuperAdminAccess(req)) as { response?: NextResponse; userId?: string };
  if (access.response) return access.response;

  const body = await req.json().catch(() => ({}));
  const { firm_client_id, since_date, through_date } = body ?? {};
  if (!firm_client_id) {
    return NextResponse.json({ error: "missing_firm_client_id" }, { status: 400 });
  }

  const runId = randomUUID();

  // Fire async — the scan may run for minutes; return the run_id immediately.
  void runHistoricalScan(firm_client_id, {
    runId,
    sinceDate: since_date,
    throughDate: through_date,
  }).catch((err) => {
    console.error("[learning/scan] scan failed", {
      firm_client_id,
      runId,
      message: err instanceof Error ? err.message : String(err),
    });
  });

  return NextResponse.json({ status: "started", run_id: runId }, { status: 202 });
}
