import { NextResponse } from "next/server";
import { getERPAdapter } from "../../../../lib/erp-adapters";
import { supabaseAdmin } from "../../../../lib/supabase";

export async function GET(request) {
  const url = new URL(request.url);
  const authCode = url.searchParams.get("code") || "";
  const intuitError = url.searchParams.get("error") || "";
  const intuitErrorDescription = url.searchParams.get("error_description") || "";
  const state = url.searchParams.get("state") || "";
  const realmId = url.searchParams.get("realmId") || "";
  const configAdapter = getERPAdapter("quickbooks", null);
  const quickBooksConfig = configAdapter.getConfig();
  const expectedState = request.cookies.get("qb_oauth_state")?.value || "";
  const oauthMode = request.cookies.get("qb_oauth_mode")?.value || "user";
  const supabaseToken = request.cookies.get("qb_oauth_token")?.value || "";
  const leadId = request.cookies.get("qb_oauth_lead_id")?.value || "";
  const returnTo = request.cookies.get("qb_oauth_return_to")?.value || "";
  const redirectUrl = new URL(returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard", request.url);

  console.log("[quickbooks/callback] received callback", {
    hasAuthCode: Boolean(authCode),
    hasState: Boolean(state),
    stateMatchesCookie: Boolean(state && expectedState && state === expectedState),
    hasSupabaseTokenCookie: Boolean(supabaseToken),
    mode: oauthMode,
    hasLeadIdCookie: Boolean(leadId),
    hasRealmId: Boolean(realmId),
    intuitError: intuitError || null,
  });

  if (intuitError) {
    console.error("[quickbooks/callback] Intuit returned an OAuth error", {
      error: intuitError,
      hasDescription: Boolean(intuitErrorDescription),
    });
    return NextResponse.json({ error: intuitError, description: intuitErrorDescription }, { status: 400 });
  }

  if (!state || !expectedState || state !== expectedState || (oauthMode === "user" && !supabaseToken) || (oauthMode === "lead" && !leadId)) {
    console.error("[quickbooks/callback] missing or invalid OAuth state cookie", {
      hasState: Boolean(state),
      hasExpectedStateCookie: Boolean(expectedState),
      stateMatchesCookie: Boolean(state && expectedState && state === expectedState),
      hasSupabaseTokenCookie: Boolean(supabaseToken),
      hasLeadIdCookie: Boolean(leadId),
      mode: oauthMode,
    });
    return NextResponse.json({ error: "Missing or invalid QuickBooks OAuth state" }, { status: 400 });
  }

  if (!authCode || !realmId) {
    console.error("[quickbooks/callback] missing required callback values", {
      hasAuthCode: Boolean(authCode),
      hasRealmId: Boolean(realmId),
    });
    return NextResponse.json({ error: "Missing required QuickBooks callback values" }, { status: 400 });
  }

  if (!supabaseAdmin) {
    console.error("[quickbooks/callback] Supabase admin client is not configured");
    return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });
  }

  try {
    console.log("[quickbooks/callback] OAuth exchange config", {
      hasClientId: Boolean(quickBooksConfig.clientId),
      hasClientSecret: Boolean(quickBooksConfig.clientSecret),
      environment: quickBooksConfig.environment,
      hasRedirectUri: Boolean(quickBooksConfig.redirectUri),
      redirectUriMatchesExpected: quickBooksConfig.redirectUri === "http://localhost:3000/api/quickbooks/callback",
    });

    const adapter = getERPAdapter("quickbooks", null);
    const tokenResponse = await adapter.exchangeAuthorizationCode(authCode);

    console.log("[quickbooks/callback] Intuit OAuth exchange response", {
      ok: tokenResponse.ok,
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      hasPayload: Boolean(tokenResponse.payload),
    });

    if (!tokenResponse.ok) {
      return NextResponse.json(
        {
          error: tokenResponse.payload?.error || "quickbooks_token_exchange_failed",
          description: tokenResponse.payload?.error_description || "QuickBooks token exchange failed.",
        },
        { status: tokenResponse.status || 500 },
      );
    }

    const token = tokenResponse.payload;

    if (oauthMode === "lead") {
      const companyProfile = await adapter.getCompanyProfile(token.access_token, realmId).catch(() => ({}));
      const { error: leadError } = await supabaseAdmin
        .from("free_review_leads")
        .update({
          legal_company_name: companyProfile.legal_name || companyProfile.company_name || "",
          status: "quickbooks_connected",
          additional_business_information: {
            quickbooks: {
              realm_id: realmId,
              company_profile: companyProfile,
              connected_at: new Date().toISOString(),
              token_stored: false,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (leadError) {
        console.error("[quickbooks/callback] failed to enrich free review lead", {
          leadId,
          message: leadError.message,
        });
      }

      redirectUrl.searchParams.set("quickBooksConnected", "true");
      redirectUrl.searchParams.set("leadId", leadId);
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete("qb_oauth_state");
      response.cookies.delete("qb_oauth_mode");
      response.cookies.delete("qb_oauth_lead_id");
      response.cookies.delete("qb_oauth_return_to");
      return response;
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(supabaseToken);

    if (authError || !authData?.user?.id) {
      console.error("[quickbooks/callback] Supabase JWT from OAuth cookie is invalid", {
        message: authError?.message,
        status: authError?.status,
      });
      return NextResponse.json({ error: "Invalid or expired Supabase token in QuickBooks OAuth cookie" }, { status: 401 });
    }

    console.log("[quickbooks/callback] OAuth exchange succeeded", {
      userId: authData.user.id,
      hasRealmId: Boolean(realmId),
      hasAccessToken: Boolean(token?.access_token),
      hasRefreshToken: Boolean(token?.refresh_token),
      expiresIn: token?.expires_in || null,
    });

    console.log("[quickbooks/callback] saving QuickBooks connection", {
      userId: authData.user.id,
      hasRealmId: Boolean(realmId),
      table: "erp_connections",
      platform: "quickbooks",
    });

    const userAdapter = getERPAdapter("quickbooks", authData.user.id);
    const savedConnection = await userAdapter.saveConnection({
      realmId,
      token,
    });

    console.log("[quickbooks/callback] Supabase save succeeded", {
      connectionId: savedConnection?.id || null,
      userId: savedConnection?.user_id || authData.user.id,
      tokenExpiry: savedConnection?.token_expiry || null,
      updatedAt: savedConnection?.updated_at || null,
    });

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("qb_oauth_state");
    response.cookies.delete("qb_oauth_mode");
    response.cookies.delete("qb_oauth_token");
    response.cookies.delete("qb_oauth_lead_id");
    response.cookies.delete("qb_oauth_return_to");
    return response;
  } catch (error) {
    console.error("[quickbooks/callback] OAuth callback failed", {
      message: error?.message,
      code: error?.error || error?.code,
      intuitTid: error?.intuit_tid,
    });
    return NextResponse.json({ error: error?.message || "QuickBooks OAuth callback failed" }, { status: 500 });
  }
}
