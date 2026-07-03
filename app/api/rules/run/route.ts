import { NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — lib/super-admin-security.js is untyped
import { resolveSuperAdminAccess } from "@/lib/super-admin-security.js";
import { triggerRunnerForClosePeriod } from "@/lib/rules/hooks/trigger-runner";
import {
  resolveClosePeriodForDate,
  resolveMostRecentClosePeriod,
} from "@/lib/close-periods/resolve-for-date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * D6.3 manual runner endpoint (setup for the D6.5 review UI). super_admin only.
 * POST { firm_client_id, close_period_id?, txn_date? }
 *   - close_period_id → run that period directly
 *   - txn_date        → resolve the covering close period
 *   - neither         → resolve the most recent close period
 * Awaits the runner (UI wants a synchronous RunSummary).
 */
export async function POST(req: Request) {
  const access = (await resolveSuperAdminAccess(req)) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;

  const body = (await req.json().catch(() => ({}))) as {
    firm_client_id?: string;
    close_period_id?: string;
    txn_date?: string;
  };

  const firmClientId = body.firm_client_id;
  if (!firmClientId) {
    return NextResponse.json({ error: "firm_client_id_required" }, { status: 400 });
  }

  let closePeriodId = body.close_period_id ?? null;
  if (!closePeriodId) {
    const resolved = body.txn_date
      ? await resolveClosePeriodForDate(firmClientId, body.txn_date)
      : await resolveMostRecentClosePeriod(firmClientId);
    if (!resolved) {
      return NextResponse.json({ error: "no_close_period_found" }, { status: 404 });
    }
    closePeriodId = resolved.close_period_id;
  }

  try {
    const summary = await triggerRunnerForClosePeriod(firmClientId, closePeriodId, "manual");
    const firesRecorded =
      summary.fires.fired +
      summary.fires.suppressed +
      summary.fires.error +
      summary.fires.not_implemented;
    return NextResponse.json({
      run_id: summary.runId,
      firm_client_id: summary.firmClientId,
      close_period_id: closePeriodId,
      rules_evaluated: summary.rulesEvaluated,
      fires_recorded: firesRecorded,
      fires: summary.fires,
      duration_ms: summary.durationMs,
      kill_switch: summary.killSwitchShortCircuit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "rule_run_failed", detail: message }, { status: 500 });
  }
}
