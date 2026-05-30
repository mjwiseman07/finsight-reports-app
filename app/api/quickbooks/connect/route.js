import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getERPAdapter } from "../../../../lib/erp-adapters";
import { rateLimit } from "../../../../lib/rate-limit";

async function handleConnect(request) {
  try {
    console.log("[quickbooks/connect] request received", {
      method: request.method,
      environment: process.env.QB_ENVIRONMENT || "sandbox",
      hasClientId: Boolean(process.env.QB_CLIENT_ID),
      hasClientSecret: Boolean(process.env.QB_CLIENT_SECRET),
      hasRedirectUri: Boolean(process.env.QB_REDIRECT_URI),
    });

    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
    }

    const missingEnvVars = ["QB_CLIENT_ID", "QB_CLIENT_SECRET", "QB_REDIRECT_URI", "QB_ENVIRONMENT"].filter(
      (key) => !process.env[key],
    );

    if (missingEnvVars.length) {
      console.error("[quickbooks/connect] missing env vars", { missingEnvVars });
      return NextResponse.json(
        {
          error: `QuickBooks OAuth environment variables are not configured: ${missingEnvVars.join(", ")}`,
        },
        { status: 500 },
      );
    }

    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Authorization bearer token" }, { status: 401 });
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authData?.user?.id) {
      console.error("[quickbooks/connect] Supabase token validation failed", {
        message: authError?.message,
        status: authError?.status,
      });
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const state = crypto.randomUUID();
    const adapter = getERPAdapter("quickbooks", authData.user.id);
    const { url, config: quickBooksConfig } = adapter.connect({ state });
    const parsedUrl = new URL(url);

    console.log("[quickbooks/connect] authorization URL generated", {
      userId: authData.user.id,
      stateLength: state.length,
      scope: "com.intuit.quickbooks.accounting",
      environment: quickBooksConfig.environment,
      hasRedirectUri: Boolean(quickBooksConfig.redirectUri),
      clientIdMatchesEnv: parsedUrl.searchParams.get("client_id") === quickBooksConfig.clientId,
      responseType: parsedUrl.searchParams.get("response_type"),
    });

    const response = NextResponse.json({ url });
    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/",
    };
    response.cookies.set("qb_oauth_state", state, cookieOptions);
    response.cookies.set("qb_oauth_token", token, cookieOptions);

    return response;
  } catch (error) {
    console.error("[quickbooks/connect] failed", {
      message: error?.message,
      name: error?.name,
    });
    return NextResponse.json(
      { error: error?.message || "Unable to start QuickBooks connection" },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "quickbooks-connect", limit: 10, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  return handleConnect(request);
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "quickbooks-connect", limit: 10, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  return handleConnect(request);
}
