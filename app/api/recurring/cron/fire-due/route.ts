import { NextResponse } from "next/server";
import { fireDueTemplatesForAllClients } from "@/lib/recurring/scheduler";

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
    const result = await fireDueTemplatesForAllClients(new Date());
    const fires_created = result.summaries.reduce((acc, s) => acc + s.fires_created, 0);
    const templates_terminated = result.summaries.reduce((acc, s) => acc + s.templates_terminated, 0);
    const errors = result.summaries.reduce((acc, s) => acc + s.errors.length, 0);

    return NextResponse.json({
      processed: result.processed,
      fires_created,
      templates_terminated,
      errors,
      summaries: result.summaries,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
