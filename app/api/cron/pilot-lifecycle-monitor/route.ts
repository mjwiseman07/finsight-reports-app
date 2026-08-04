import { NextResponse } from "next/server";
import { runDriftDetector } from "@/lib/pilot-lifecycle/drift-detector";
import { runChainIntegrityMonitor } from "@/lib/pilot-lifecycle/chain-monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (
    !process.env.CRON_SECRET ||
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const t0 = Date.now();
  const drift = await runDriftDetector();
  const t1 = Date.now();
  const chain = await runChainIntegrityMonitor();
  const t2 = Date.now();

  return NextResponse.json({
    ok: true,
    drift: {
      ...drift,
      duration_ms: t1 - t0,
    },
    chain: {
      ...chain,
      duration_ms: t2 - t1,
    },
    total_duration_ms: t2 - t0,
    ran_at: new Date().toISOString(),
  });
}
