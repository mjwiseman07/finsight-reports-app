import { NextRequest, NextResponse } from "next/server";
import { runAnchorBatch } from "@/lib/pilot-lifecycle/anchor-batcher";
import { recordIssue } from "@/lib/pilot-lifecycle/issue-recorder";

/**
 * Phase MEM_LIFECYCLE Block 9 — hourly RFC 3161 batch anchor cron.
 * Auth: Bearer ${CRON_SECRET} (same pattern as seo-drift-monitor).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await runAnchorBatch();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // recordIssue is best-effort here — the anchor-batcher itself may have
    // already logged a fatal issue with more context. This is the outer
    // safety net for unexpected exceptions (bad env, network stack down, etc).
    try {
      await recordIssue({
        fingerprint: `pilot-lifecycle-anchor:cron-crash:${new Date().toISOString().slice(0, 13)}`,
        level: "error",
        issueKind: "pilot.lifecycle.chain.anchor",
        companyId: null,
        firmId: null,
        extra: { error: message },
        message: `Chain anchor cron crashed: ${message}`,
      });
    } catch {
      /* swallow — never let logging fail the response */
    }
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
