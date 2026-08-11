/**
 * W1c.2 — Kill-switch admin route.
 *
 * POST /api/admin/write-boundary/enable
 * POST /api/admin/write-boundary/disable
 *
 * Body: { connection_id: string, provider: "quickbooks" | "xero" }
 * Auth: resolveSuperAdminAccess (super_admin role + allowlisted email).
 * AAL2/MFA is enforced by middleware for /api/admin/* (MFA_SENSITIVE_PREFIXES).
 *
 * Sets accounting_connections.metadata_json.write_enabled_{provider} = boolean.
 * Emits a write-boundary lifecycle event so the audit trail is hash-chained.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import { emitWriteLifecycleEvent } from "@/lib/accounting/write-boundary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActionParam = "enable" | "disable";
const VALID_ACTIONS: ReadonlySet<ActionParam> = new Set(["enable", "disable"]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action: rawAction } = await params;
  const action = rawAction as ActionParam;
  if (!VALID_ACTIONS.has(action)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }

  const access = (await resolveSuperAdminAccess(req)) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;
  const userId = access.userId;
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const connectionId = String((body as { connection_id?: string })?.connection_id ?? "");
  const provider = String((body as { provider?: string })?.provider ?? "");
  if (!connectionId || (provider !== "quickbooks" && provider !== "xero")) {
    return NextResponse.json(
      { error: "connection_id and provider ('quickbooks'|'xero') required" },
      { status: 400 },
    );
  }

  const admin = getSupabaseAdmin();
  const { data: connection, error: readErr } = await admin
    .from("accounting_connections")
    .select("id, tenant_or_realm_id, metadata_json, provider")
    .eq("id", connectionId)
    .maybeSingle();
  if (readErr || !connection) {
    return NextResponse.json(
      { error: "connection_not_found", details: readErr?.message },
      { status: 404 },
    );
  }

  const key = provider === "xero" ? "write_enabled_xero" : "write_enabled_quickbooks";
  const newValue = action === "enable";
  const newMetadata = {
    ...((connection.metadata_json as Record<string, unknown> | null) ?? {}),
    [key]: newValue,
  };
  const { error: updErr } = await admin
    .from("accounting_connections")
    .update({ metadata_json: newMetadata })
    .eq("id", connectionId);
  if (updErr) {
    return NextResponse.json({ error: "update_failed", details: updErr.message }, { status: 500 });
  }

  // Best-effort lifecycle emit via firm_clients.owner_user_id / company_id → pilot_slots.
  // Schema has no accounting_connection_id on firm_clients.
  const { data: connUser } = await admin
    .from("accounting_connections")
    .select("user_id")
    .eq("id", connectionId)
    .maybeSingle();
  if (connUser?.user_id) {
    const { data: fc } = await admin
      .from("firm_clients")
      .select("id, company_id")
      .eq("owner_user_id", connUser.user_id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (fc?.company_id) {
      const { data: slot } = await admin
        .from("pilot_slots")
        .select("id")
        .eq("company_id", fc.company_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (slot?.id) {
        await emitWriteLifecycleEvent({
          admin,
          pilotSlotId: slot.id as string,
          eventKind: newValue
            ? "pilot.lifecycle.write-validated"
            : "pilot.lifecycle.write-rejected",
          payload: {
            connection_id: connectionId,
            tenant_id: (connection.tenant_or_realm_id as string) ?? "",
            source_system: provider as "xero" | "quickbooks",
            external_ref: `admin-toggle:${connectionId}:${Date.now()}`,
            narration: `write boundary ${action}d by super-admin ${userId}`,
            journal_date: new Date().toISOString().slice(0, 10),
            currency: "USD",
            line_count: 0,
            total_debits: 0,
            total_credits: 0,
            request_hash: "n/a",
            provenance: "live",
            triggered_by: userId,
            validation_issues: [
              {
                code: "kill_switch_toggle",
                message: `set metadata_json.${key} = ${newValue}`,
              },
            ],
          },
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    action,
    connection_id: connectionId,
    key,
    value: newValue,
  });
}
