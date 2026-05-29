import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getERPAdapter } from "../../../../lib/erp-adapters";

function maskEnvValue(value) {
  if (!value) return "undefined";
  if (value.length <= 8) return "defined";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

console.log("[quickbooks/connect] env check", {
  QB_CLIENT_ID: maskEnvValue(process.env.QB_CLIENT_ID),
  QB_CLIENT_SECRET: process.env.QB_CLIENT_SECRET ? "defined" : "undefined",
  QB_REDIRECT_URI: process.env.QB_REDIRECT_URI || "undefined",
  QB_ENVIRONMENT: process.env.QB_ENVIRONMENT || "undefined",
});

async function handleConnect(request) {
  try {
    console.log("[quickbooks/connect] QB env values", {
      QB_CLIENT_ID: process.env.QB_CLIENT_ID || "undefined",
      QB_CLIENT_ID_FIRST_10: process.env.QB_CLIENT_ID?.slice(0, 10) || "undefined",
      QB_CLIENT_ID_LAST_10: process.env.QB_CLIENT_ID?.slice(-10) || "undefined",
      QB_CLIENT_ID_LENGTH: process.env.QB_CLIENT_ID?.length || 0,
      QB_CLIENT_SECRET: process.env.QB_CLIENT_SECRET ? "defined - hidden" : "undefined",
      QB_REDIRECT_URI: process.env.QB_REDIRECT_URI || "undefined",
      QB_ENVIRONMENT: process.env.QB_ENVIRONMENT || "undefined",
    });

    console.log("[quickbooks/connect] request received", {
      method: request.method,
      environment: process.env.QB_ENVIRONMENT || "sandbox",
      hasClientId: Boolean(process.env.QB_CLIENT_ID),
      hasClientSecret: Boolean(process.env.QB_CLIENT_SECRET),
      redirectUri: process.env.QB_REDIRECT_URI || null,
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
      redirectUri: quickBooksConfig.redirectUri,
      clientIdMatchesEnv: parsedUrl.searchParams.get("client_id") === quickBooksConfig.clientId,
      clientIdInUrl: parsedUrl.searchParams.get("client_id") || "missing",
      responseType: parsedUrl.searchParams.get("response_type"),
      urlPreview: url.replace(quickBooksConfig.clientId, maskEnvValue(quickBooksConfig.clientId)),
    });
    console.log("[quickbooks/connect] FULL_AUTHORIZATION_URL", url);

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
      stack: error?.stack,
      name: error?.name,
      fullError: error,
    });
    return NextResponse.json(
      { error: error?.message || "Unable to start QuickBooks connection" },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  return handleConnect(request);
}

export async function POST(request) {
  return handleConnect(request);
}
