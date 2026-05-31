import { NextResponse } from "next/server";
import { selectEntity } from "../../../../lib/integrations/accounting";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "accounting-select-entity", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    const body = await request.json().catch(() => ({}));
    const connectionId = String(body.connectionId || body.connection_id || "");
    const entityId = String(body.entityId || body.entity_id || "");
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
    if (!connectionId || !entityId) return NextResponse.json({ error: "connectionId and entityId are required" }, { status: 400 });
    if (!token) return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    return NextResponse.json({ entity: await selectEntity(connectionId, authData.user.id, entityId) });
  } catch (error) {
    console.error("[accounting/select-entity] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to select accounting entity" }, { status: 500 });
  }
}
