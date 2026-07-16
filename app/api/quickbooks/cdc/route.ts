// Issue #4 — QBO CDC hourly reconciliation cron entry point.
// Auth pattern matches app/api/recurring/cron/fire-due/route.ts.

import { NextResponse } from "next/server";
import { runCdcReconciliation } from "@/lib/qbo/cdc.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — matches the RUN_BUDGET_MS in cdc.js (4 min) + margin

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_secret_not_configured" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") || "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCdcReconciliation();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[qbo-cdc] route threw", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
