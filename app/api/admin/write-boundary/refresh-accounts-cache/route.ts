/**
 * WBP W1c.4c — Admin manual trigger for refreshAccountsCache.
 *
 * Auth: resolveSuperAdminAccess + middleware AAL2 on /api/admin/*
 * Body: { connection_id, provider: "quickbooks" | "xero" }
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import { getProviderLaneAdapter } from "@/lib/integrations/shared/compatibility/providerLaneRegistry";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  connection_id?: string;
  provider?: "quickbooks" | "xero";
};

export async function POST(req: Request): Promise<NextResponse> {
  const access = (await resolveSuperAdminAccess(req)) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;
  if (!access.userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const connectionId = body.connection_id;
  const provider = body.provider;

  if (!connectionId || !provider) {
    return NextResponse.json(
      { error: "missing_fields", required: ["connection_id", "provider"] },
      { status: 400 },
    );
  }
  if (provider !== "quickbooks" && provider !== "xero") {
    return NextResponse.json({ error: "invalid_provider" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: connection, error: connErr } = await admin
    .from("accounting_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();

  if (connErr || !connection) {
    return NextResponse.json({ error: "connection_not_found" }, { status: 404 });
  }
  if (connection.provider !== provider) {
    return NextResponse.json({ error: "provider_mismatch" }, { status: 400 });
  }

  const accountingProvider = getProviderLaneAdapter(provider);

  try {
    const result = await accountingProvider.refreshAccountsCache(
      connection as AccountingConnectionRecord,
      { trigger: "manual" },
    );
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "refresh_failed", message }, { status: 500 });
  }
}
