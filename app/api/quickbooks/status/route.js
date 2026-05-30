import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getERPAdapter } from "../../../../lib/erp-adapters";
import { rateLimit } from "../../../../lib/rate-limit";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "quickbooks-status", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase is not configured for this deployment." }, { status: 503 });
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData?.user?.id) {
      console.error("[quickbooks/status] Supabase token validation failed", {
        message: authError?.message,
        status: authError?.status,
      });
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const adapter = getERPAdapter("quickbooks", authData.user.id);
    const connection = await adapter.getConnection();

    console.log("[quickbooks/status] connection lookup complete", {
      userId: authData.user.id,
      connected: Boolean(connection),
      connectionId: connection?.id || null,
      platform: connection?.platform || "quickbooks",
    });

    if (!connection) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      realm_id: connection.realm_id,
      platform: connection.platform || "quickbooks",
    });
  } catch (error) {
    console.error("[quickbooks/status] connection lookup failed", {
      message: error?.message,
    });
    return NextResponse.json({ error: error?.message || "Unable to check QuickBooks status" }, { status: 500 });
  }
}
