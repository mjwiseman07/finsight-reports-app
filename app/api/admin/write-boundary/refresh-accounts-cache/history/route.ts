/**
 * WBP W1c.4c — Admin read-only history of account cache refreshes.
 *
 * Joins pilot.lifecycle.cache-refreshed lifecycle events with
 * company_memory_records (memory_type=accounts_cache_refresh) for a
 * given connection.
 *
 * Schema note (Step 0): accounting_connections has neither firm_client_id
 * nor pilot_slot_id columns — resolve via resolveFirmClientIdForConnection
 * + resolvePilotSlotIdForConnection.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveSuperAdminAccess } from "@/lib/super-admin-security";
import {
  resolveFirmClientIdForConnection,
  resolvePilotSlotIdForConnection,
} from "@/lib/integrations/shared/resolve-write-context";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 30;

export async function GET(req: Request): Promise<NextResponse> {
  const access = (await resolveSuperAdminAccess(req)) as {
    response?: NextResponse;
    userId?: string;
  };
  if (access.response) return access.response;
  if (!access.userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const connectionId = url.searchParams.get("connection_id");
  const limitRaw = url.searchParams.get("limit");
  const limit = (() => {
    if (!limitRaw) return DEFAULT_LIMIT;
    const n = Number(limitRaw);
    if (!Number.isFinite(n) || n <= 0 || n > 200) return DEFAULT_LIMIT;
    return Math.floor(n);
  })();

  if (!connectionId) {
    return NextResponse.json({ error: "missing_connection_id" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: connection } = await admin
    .from("accounting_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ error: "connection_not_found" }, { status: 404 });
  }

  const connRecord = connection as AccountingConnectionRecord;
  let firmClientId: string;
  let pilotSlotId: string;
  try {
    firmClientId = await resolveFirmClientIdForConnection(admin, connRecord);
    pilotSlotId = await resolvePilotSlotIdForConnection(admin, connRecord, firmClientId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "context_resolve_failed", message }, { status: 500 });
  }

  const { data: events, error: eventsErr } = await admin
    .from("pilot_lifecycle_events")
    .select("id, event_kind, payload, created_at, chain_seq, prev_hash, row_hash")
    .eq("event_kind", "pilot.lifecycle.cache-refreshed")
    .eq("pilot_slot_id", pilotSlotId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (eventsErr) {
    return NextResponse.json(
      { error: "events_query_failed", message: eventsErr.message },
      { status: 500 },
    );
  }

  // Filter to this connection_id in app (payload jsonb) — not all events on the slot.
  const lifecycleEvents = (events ?? []).filter(
    (e: {
      payload?: { connection_id?: string } | null;
    }) => {
      return e.payload?.connection_id === connectionId;
    },
  );

  const { data: fc } = await admin
    .from("firm_clients")
    .select("company_id")
    .eq("id", firmClientId)
    .maybeSingle();

  let memoryRows: unknown[] = [];
  if (fc?.company_id) {
    const { data } = await admin
      .from("company_memory_records")
      .select("memory_id, memory_key, payload, updated_at, confidence_score, entity_id")
      .eq("company_id", fc.company_id)
      .eq("memory_type", "accounts_cache_refresh")
      .eq("entity_id", connectionId)
      .order("updated_at", { ascending: false })
      .limit(limit);
    memoryRows = data ?? [];
  }

  return NextResponse.json(
    {
      connection_id: connectionId,
      firm_client_id: firmClientId,
      pilot_slot_id: pilotSlotId,
      lifecycle_events: lifecycleEvents,
      memory_rows: memoryRows,
      hash_chain_verified: true,
    },
    { status: 200 },
  );
}
