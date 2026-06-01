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

    const requestUrl = new URL(request.url);
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
    const requestedLeadId = requestUrl.searchParams.get("leadId") || request.cookies.get("free_review_lead_id")?.value || "";
    let connectContext = null;

    if (token) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !authData?.user?.id) {
        console.error("[quickbooks/connect] Supabase token validation failed", {
          message: authError?.message,
          status: authError?.status,
        });
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }

      connectContext = {
        mode: "user",
        userId: authData.user.id,
        token,
      };
    } else if (requestedLeadId) {
      const { data: lead, error: leadError } = await supabaseAdmin
        .from("free_review_leads")
        .select("id, email, business_name")
        .eq("id", requestedLeadId)
        .maybeSingle();

      if (leadError?.code === "42P01") {
        return NextResponse.json({ error: "Run the free review leads migration before connecting QuickBooks from onboarding." }, { status: 501 });
      }

      if (leadError || !lead?.id) {
        return NextResponse.json({ error: "Lead capture is required before connecting QuickBooks." }, { status: 401 });
      }

      connectContext = {
        mode: "lead",
        leadId: lead.id,
      };
    } else {
      return NextResponse.json({ error: "Lead capture or sign-in is required before connecting QuickBooks." }, { status: 401 });
    }

    const state = crypto.randomUUID();
    const adapter = getERPAdapter("quickbooks", connectContext.userId || null);
    const { url, config: quickBooksConfig } = adapter.connect({ state });
    const parsedUrl = new URL(url);
    const returnTo = requestUrl.searchParams.get("returnTo") || "";
    const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "";

    console.log("[quickbooks/connect] authorization URL generated", {
      mode: connectContext.mode,
      userId: connectContext.userId || null,
      leadId: connectContext.leadId || null,
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
    response.cookies.set("qb_oauth_mode", connectContext.mode, cookieOptions);
    if (connectContext.token) response.cookies.set("qb_oauth_token", connectContext.token, cookieOptions);
    if (connectContext.leadId) response.cookies.set("qb_oauth_lead_id", connectContext.leadId, cookieOptions);
    if (safeReturnTo) response.cookies.set("qb_oauth_return_to", safeReturnTo, cookieOptions);

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
