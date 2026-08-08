import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  hashSpikeResult,
  runXeroSandboxSpike,
  WBP_XERO_SPIKE_TENANT_ID,
  type XeroSandboxSpikeResult,
} from "@/lib/wbp/xero-sandbox-spike";
import { ensureLifecycleAnchor } from "@/lib/lifecycle/ensure-anchor";
import { emitSyncLifecycleEvent } from "@/lib/lifecycle/emit-sync-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

function tokensMatch(provided: string, expected: string): boolean {
  if (!expected || provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-wbp-spike-token") ?? "";
  const expected = process.env.WBP_SPIKE_TOKEN ?? "";
  if (!tokensMatch(provided, expected)) return unauthorized();

  const encKey =
    process.env.ACCOUNTING_TOKEN_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!encKey) {
    return NextResponse.json({ error: "no_encryption_key_available" }, { status: 500 });
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "supabase_env_missing" }, { status: 500 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let result: XeroSandboxSpikeResult;
  try {
    result = await runXeroSandboxSpike({
      supabaseClient: supabase,
      encryptionKey: encKey,
      tenantIdGuard: WBP_XERO_SPIKE_TENANT_ID,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    return NextResponse.json({ error: "spike_execution_failed", message, stack }, { status: 500 });
  }

  const resultHash = hashSpikeResult(result);

  try {
    const { pilotSlotId } = await ensureLifecycleAnchor({
      admin: supabase,
      userId: result.connectionUserId,
      sourceSystemCompanyName: "Xero Demo Company (US)",
    });
    await emitSyncLifecycleEvent({
      admin: supabase,
      pilotSlotId,
      eventKind: "pilot.lifecycle.wbp-probe-result",
      payload: {
        connection_id: result.connectionId,
        tenant_id: result.tenantId,
        tenant_name: "Xero Demo Company (US)",
        source_system: "xero",
        outcome: "succeeded",
        provenance: "live",
        triggered_by: "wbp-w0.5-preview-route",
        probe: "W0.5_sandbox_spike",
        run_id: result.runId,
        result_hash: resultHash,
        summary: {
          currencyVariantsPosted: result.tests.currency.variants.filter((v) => v.posted).length,
          signConventionPosted: result.tests.signConvention.posted,
          forbiddenAccountsAttempted: result.tests.forbiddenAccounts.attempts.length,
          forbiddenAccountsRejected: result.tests.forbiddenAccounts.attempts.filter((a) => !a.posted)
            .length,
        },
      },
    });
  } catch (emitErr: unknown) {
    result.raw.calls.push({
      url: "internal:lifecycle_emit",
      method: "INTERNAL",
      responseStatus: 500,
      responseBody: {
        error: emitErr instanceof Error ? emitErr.message : String(emitErr),
      },
      durationMs: 0,
    });
  }

  // resultHash recomputed above; keep stable for callers
  return NextResponse.json({
    ok: true,
    resultHash,
    result,
  });
}
