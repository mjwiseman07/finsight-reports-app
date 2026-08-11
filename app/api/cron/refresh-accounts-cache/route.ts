/**
 * WBP W1c.4c — Daily 05:00 UTC cron: refresh accounts cache for every
 * connected quickbooks + xero connection.
 *
 * Auth: Authorization: Bearer ${CRON_SECRET} OR x-cron-secret header.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { getProviderLaneAdapter } from "@/lib/integrations/shared/compatibility/providerLaneRegistry";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function checkCronAuth(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;
  const cronHeader = req.headers.get("x-cron-secret");
  if (cronHeader === secret) return true;
  return false;
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!checkCronAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: connections, error: connErr } = await admin
    .from("accounting_connections")
    .select("*")
    .in("provider", ["quickbooks", "xero"])
    .eq("status", "connected");

  if (connErr) {
    return NextResponse.json(
      { error: "query_failed", message: connErr.message },
      { status: 500 },
    );
  }

  const results: Array<{
    connection_id: string;
    provider: string;
    status: "success" | "failure";
    added?: number;
    updated?: number;
    removed?: number;
    total?: number;
    error?: string;
  }> = [];

  for (const conn of connections ?? []) {
    const providerKey = conn.provider as "quickbooks" | "xero";
    if (providerKey !== "quickbooks" && providerKey !== "xero") continue;
    try {
      const provider = getProviderLaneAdapter(providerKey);
      const r = await provider.refreshAccountsCache(conn as AccountingConnectionRecord, {
        trigger: "scheduled",
      });
      results.push({
        connection_id: conn.id as string,
        provider: providerKey,
        status: "success",
        added: r.addedAccounts,
        updated: r.updatedAccounts,
        removed: r.removedAccounts,
        total: r.totalAccounts,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        connection_id: conn.id as string,
        provider: providerKey,
        status: "failure",
        error: message,
      });
    }
  }

  return NextResponse.json(
    {
      ran_at: new Date().toISOString(),
      total_connections: results.length,
      successes: results.filter((r) => r.status === "success").length,
      failures: results.filter((r) => r.status === "failure").length,
      results,
    },
    { status: 200 },
  );
}
