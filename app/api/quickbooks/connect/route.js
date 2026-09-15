import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getERPAdapter } from "../../../../lib/erp-adapters";
import { rateLimit } from "../../../../lib/rate-limit";
import { createQboOAuthEnvironmentState } from "@/lib/erp/quickbooks/oauth-environment-state";
import { resolveLeadSessionFromRequest } from "@/lib/free-review/lead-session";

async function handleConnect(request) {
  try {
    console.log("[quickbooks/connect] request received", {
      method: request.method,
      environment: process.env.QB_ENVIRONMENT || null,
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
    // Lead authority: opaque free_review_lead_session only (never query/body/legacy lead UUID).
    let connectContext = null;

    if (token) {
      const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !authData?.user?.id) {
        console.error("[quickbooks/connect] Supabase token validation failed", {
          message: authError?.message,
          status: authError?.status,
        });
        // Fail closed: do not fall through to lead session when bearer is present but invalid.
        return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
      }

      connectContext = {
        mode: "user",
        userId: authData.user.id,
        token,
      };
    } else {
      const leadSession = await resolveLeadSessionFromRequest(request);
      if (!leadSession) {
        return NextResponse.json({ error: "Lead capture or sign-in is required before connecting QuickBooks." }, { status: 401 });
      }

      connectContext = {
        mode: "lead",
        leadId: leadSession.leadId,
      };
    }

    const { state, expectedProviderEnvironment } = createQboOAuthEnvironmentState();
    const adapter = getERPAdapter("quickbooks", connectContext.userId || null);
    const { url, config: quickBooksConfig } = adapter.connect({ state });
    const parsedUrl = new URL(url);
    const rawReturnTo = requestUrl.searchParams.get("returnTo") || "/dashboard";
    // Stale /onboarding returnTo from legacy cookies/links must not win.
    const normalizedReturnTo =
      rawReturnTo === "/onboarding" || rawReturnTo.startsWith("/onboarding?")
        ? "/dashboard"
        : rawReturnTo;
    const safeReturnTo =
      normalizedReturnTo.startsWith("/") && !normalizedReturnTo.startsWith("//")
        ? normalizedReturnTo
        : "/dashboard";

    console.log("[quickbooks/connect] authorization URL generated", {
      mode: connectContext.mode,
      userId: connectContext.userId || null,
      leadId: connectContext.leadId || null,
      stateLength: state.length,
      scope: "com.intuit.quickbooks.accounting",
      environment: quickBooksConfig.environment,
      expectedProviderEnvironment,
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
    response.cookies.set("qb_oauth_return_to", safeReturnTo, cookieOptions);

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
