import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase";
import { rateLimit } from "../../../../../lib/rate-limit";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "xero-status", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });

    const url = new URL(request.url);
    const connectionId = url.searchParams.get("connectionId") || "";
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

    if (!token) return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });

    let query = supabaseAdmin
      .from("accounting_connections")
      .select("id, provider, external_entity_id, external_entity_name, tenant_or_realm_id, status, token_expires_at, scopes, metadata_json, created_at, updated_at")
      .eq("user_id", authData.user.id)
      .eq("provider", "xero")
      .order("updated_at", { ascending: false });

    if (connectionId) query = query.eq("id", connectionId);

    const { data, error } = await query.limit(5);
    if (error) throw error;

    return NextResponse.json({
      provider: "xero",
      connected: Boolean((data || []).some((connection) => connection.status === "connected" || connection.status === "needs_entity_selection")),
      connections: (data || []).map((connection) => ({
        id: connection.id,
        sourceSystem: "xero",
        tenantId: connection.tenant_or_realm_id,
        tenantName: connection.external_entity_name,
        status: connection.status,
        expiresAt: connection.token_expires_at,
        connectedAt: connection.metadata_json?.connected_at || connection.created_at,
        lastSyncedAt: connection.metadata_json?.last_synced_at || null,
        scopes: connection.scopes || [],
        tokensEncrypted: Boolean(connection.metadata_json?.tokens_encrypted),
      })),
    });
  } catch (error) {
    console.error("[integrations/xero/status] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to load Xero status" }, { status: 500 });
  }
}
