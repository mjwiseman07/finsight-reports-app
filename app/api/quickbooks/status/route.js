import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getERPAdapter } from "../../../../lib/erp-adapters";

export async function GET(request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
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
      realmId: connection?.realm_id || null,
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
      stack: error?.stack,
      fullError: error,
    });
    return NextResponse.json({ error: error?.message || "Unable to check QuickBooks status" }, { status: 500 });
  }
}
