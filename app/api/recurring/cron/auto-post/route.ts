import { NextResponse } from "next/server";
import { dispatchAutoPostForAllClients } from "@/lib/recurring/auto-post-dispatcher";

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

  try {
    const result = await dispatchAutoPostForAllClients();
    const dispatched = result.summaries.reduce((a, s) => a + s.dispatched, 0);
    const posted = result.summaries.reduce((a, s) => a + s.posted, 0);
    const failed = result.summaries.reduce((a, s) => a + s.failed, 0);
    const rejected = result.summaries.reduce((a, s) => a + s.rejected, 0);
    const held = result.summaries.reduce((a, s) => a + s.held, 0);

    return NextResponse.json({
      processed: result.processed,
      dispatched,
      posted,
      failed,
      rejected,
      held,
      summaries: result.summaries,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
