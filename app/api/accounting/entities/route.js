import { NextResponse } from "next/server";
import { listEntities } from "../../../../lib/integrations/accounting";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "accounting-entities", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    const url = new URL(request.url);
    const connectionId = url.searchParams.get("connectionId") || "";
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
    if (!connectionId) return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
    if (!token) return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    return NextResponse.json({ entities: await listEntities(connectionId, authData.user.id) });
  } catch (error) {
    console.error("[accounting/entities] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to list accounting entities" }, { status: 500 });
  }
}
