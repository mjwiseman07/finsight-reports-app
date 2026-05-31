import { NextResponse } from "next/server";
import { startConnection, saveOAuthCookies } from "../../../../lib/integrations/accounting";
import { supabaseAdmin } from "../../../../lib/supabase";
import { rateLimit } from "../../../../lib/rate-limit";

async function handleConnect(request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });

    const url = new URL(request.url);
    const provider = url.searchParams.get("provider") || "quickbooks";
    const returnTo = url.searchParams.get("returnTo") || "";
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

    if (!token) return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData?.user?.id) return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });

    const result = await startConnection(provider, authData.user, returnTo);
    await saveOAuthCookies({
      state: result.state,
      token,
      returnTo: returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "",
    });

    console.log("[accounting/connect] authorization URL generated", {
      provider,
      userId: authData.user.id,
      stateLength: result.state.length,
    });

    return NextResponse.json({ url: result.url, provider: result.provider });
  } catch (error) {
    console.error("[accounting/connect] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to start accounting connection" }, { status: 500 });
  }
}

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "accounting-connect", limit: 10, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;
  return handleConnect(request);
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "accounting-connect", limit: 10, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;
  return handleConnect(request);
}
