import { NextResponse } from "next/server";
import crypto from "crypto";
import { getAccountingProvider, startConnection, saveOAuthCookies } from "../../../../../lib/integrations/accounting";
import { supabaseAdmin } from "../../../../../lib/supabase";
import { rateLimit } from "../../../../../lib/rate-limit";

async function handleConnect(request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });

    const url = new URL(request.url);
    const cookieReturnTo = request.cookies.get("advisacor_oauth_return_to")?.value || "";
    const returnTo = url.searchParams.get("returnTo") || (cookieReturnTo ? decodeURIComponent(cookieReturnTo) : "") || "/dashboard";
    const authorization = request.headers.get("authorization") || "";
    const cookieToken = request.cookies.get("advisacor_oauth_token")?.value || "";
    const cookieLeadId = request.cookies.get("advisacor_oauth_lead_id")?.value || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : (cookieToken ? decodeURIComponent(cookieToken) : "");
    const leadId = cookieLeadId ? decodeURIComponent(cookieLeadId) : "";
    console.log("XERO CONNECT ROUTE HIT");
    console.log("[integrations/xero/connect] reached", {
      method: request.method,
      hasAuthorization: Boolean(token),
      hasLeadId: Boolean(leadId),
      returnTo,
      hasClientId: Boolean(process.env.XERO_CLIENT_ID),
      hasClientSecret: Boolean(process.env.XERO_CLIENT_SECRET),
      hasRedirectUri: Boolean(process.env.XERO_REDIRECT_URI),
      environment: process.env.XERO_ENV || "development",
    });

    if (!token) {
      console.log("session user:", "NO SESSION");
      if (leadId) {
        const { data: lead, error: leadError } = await supabaseAdmin
          .from("free_review_leads")
          .select("id")
          .eq("id", leadId)
          .maybeSingle();
        if (leadError || !lead?.id) {
          return NextResponse.json({ error: "Lead capture is required before connecting Xero." }, { status: 401 });
        }
        const state = crypto.randomUUID();
        const provider = getAccountingProvider("xero");
        const authorizationUrl = await provider.getAuthorizationUrl({ state, returnTo });
        const response = NextResponse.redirect(authorizationUrl);
        const cookieOptions = {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 10 * 60,
          path: "/",
        };
        response.cookies.set("xero_oauth_state", state, cookieOptions);
        response.cookies.set("xero_oauth_mode", "lead", cookieOptions);
        response.cookies.set("xero_oauth_lead_id", leadId, cookieOptions);
        response.cookies.set("xero_oauth_return_to", returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/onboarding", cookieOptions);
        response.cookies.set("advisacor_oauth_lead_id", "", { path: "/", maxAge: 0 });
        response.cookies.set("advisacor_oauth_return_to", "", { path: "/", maxAge: 0 });
        return response;
      }
      const signinUrl = new URL("/signin", request.url);
      signinUrl.searchParams.set("next", "/api/integrations/xero/connect");
      return NextResponse.redirect(signinUrl);
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    console.log("session user:", authData?.user?.id || "NO SESSION");
    if (authError || !authData?.user?.id) {
      const signinUrl = new URL("/signin", request.url);
      signinUrl.searchParams.set("next", "/api/integrations/xero/connect");
      return NextResponse.redirect(signinUrl);
    }

    const result = await startConnection("xero", authData.user, returnTo);
    await saveOAuthCookies({
      state: result.state,
      token,
      returnTo: returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard",
    });

    const wantsJson = request.headers.get("accept")?.includes("application/json");
    if (wantsJson) {
      return NextResponse.json({
        url: result.url,
        provider: "xero",
        environment: process.env.XERO_ENV || "development",
      });
    }

    const response = NextResponse.redirect(result.url);
    response.cookies.set("advisacor_oauth_token", "", { path: "/", maxAge: 0 });
    response.cookies.set("advisacor_oauth_return_to", "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("[integrations/xero/connect] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to start Xero connection" }, { status: 500 });
  }
}

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "xero-connect", limit: 10, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;
  return handleConnect(request);
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "xero-connect", limit: 10, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;
  return handleConnect(request);
}
