import { NextResponse } from "next/server";
import { getERPAdapter } from "../../../../lib/erp-adapters";
import { supabaseAdmin } from "../../../../lib/supabase";

function summarizeValue(value, firstLength = 6, lastLength = 4) {
  const normalizedValue = value || "";
  return {
    first: normalizedValue.slice(0, firstLength),
    last: normalizedValue.slice(-lastLength),
    length: normalizedValue.length,
  };
}

export async function GET(request) {
  const redirectUrl = new URL("/dashboard", request.url);
  const url = new URL(request.url);
  const authCode = url.searchParams.get("code") || "";
  const intuitError = url.searchParams.get("error") || "";
  const intuitErrorDescription = url.searchParams.get("error_description") || "";
  const state = url.searchParams.get("state") || "";
  const realmId = url.searchParams.get("realmId") || "";
  const configAdapter = getERPAdapter("quickbooks", null);
  const quickBooksConfig = configAdapter.getConfig();
  const expectedState = request.cookies.get("qb_oauth_state")?.value || "";
  const supabaseToken = request.cookies.get("qb_oauth_token")?.value || "";

  console.log("[quickbooks/callback] QB env values", {
    QB_CLIENT_ID_FIRST_6: process.env.QB_CLIENT_ID?.slice(0, 6) || "undefined",
    QB_CLIENT_ID_LAST_4: process.env.QB_CLIENT_ID?.slice(-4) || "undefined",
    QB_CLIENT_ID_LENGTH: process.env.QB_CLIENT_ID?.length || 0,
    QB_CLIENT_SECRET_FIRST_6: process.env.QB_CLIENT_SECRET?.slice(0, 6) || "undefined",
    QB_CLIENT_SECRET_LAST_4: process.env.QB_CLIENT_SECRET?.slice(-4) || "undefined",
    QB_CLIENT_SECRET_LENGTH: process.env.QB_CLIENT_SECRET?.length || 0,
    QB_REDIRECT_URI: process.env.QB_REDIRECT_URI || "undefined",
    QB_ENVIRONMENT: process.env.QB_ENVIRONMENT || "undefined",
  });

  console.log("[quickbooks/callback] received callback", {
    hasAuthCode: Boolean(authCode),
    authCodeLength: authCode.length,
    hasState: Boolean(state),
    stateMatchesCookie: Boolean(state && expectedState && state === expectedState),
    hasSupabaseTokenCookie: Boolean(supabaseToken),
    realmId: realmId || null,
    intuitError: intuitError || null,
    intuitErrorDescription: intuitErrorDescription || null,
  });

  if (intuitError) {
    console.error("[quickbooks/callback] Intuit returned an OAuth error", {
      error: intuitError,
      description: intuitErrorDescription,
      fullCallbackUrl: request.url,
    });
    return NextResponse.json({ error: intuitError, description: intuitErrorDescription }, { status: 400 });
  }

  if (!state || !expectedState || state !== expectedState || !supabaseToken) {
    console.error("[quickbooks/callback] missing or invalid OAuth state cookie", {
      hasState: Boolean(state),
      hasExpectedStateCookie: Boolean(expectedState),
      stateMatchesCookie: Boolean(state && expectedState && state === expectedState),
      hasSupabaseTokenCookie: Boolean(supabaseToken),
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
    console.log("[quickbooks/callback] token exchange config", {
      clientIdFirst6: summarizeValue(quickBooksConfig.clientId).first,
      clientIdLast4: summarizeValue(quickBooksConfig.clientId).last,
      clientIdLength: quickBooksConfig.clientId.length,
      clientSecretFirst6: summarizeValue(quickBooksConfig.clientSecret).first,
      clientSecretLast4: summarizeValue(quickBooksConfig.clientSecret).last,
      clientSecretLength: quickBooksConfig.clientSecret.length,
      environment: quickBooksConfig.environment,
      redirectUri: quickBooksConfig.redirectUri,
      redirectUriMatchesExpected: quickBooksConfig.redirectUri === "http://localhost:3000/api/quickbooks/callback",
    });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(supabaseToken);

    if (authError || !authData?.user?.id) {
      console.error("[quickbooks/callback] Supabase JWT from OAuth cookie is invalid", {
        message: authError?.message,
        status: authError?.status,
      });
      return NextResponse.json({ error: "Invalid or expired Supabase token in QuickBooks OAuth cookie" }, { status: 401 });
    }

    console.log("[quickbooks/callback] exchanging authorization code", {
      userId: authData.user.id,
      realmId,
      redirectUri: process.env.QB_REDIRECT_URI || null,
    });

    const adapter = getERPAdapter("quickbooks", authData.user.id);
    const tokenResponse = await adapter.exchangeAuthorizationCode(authCode);

    console.log("[quickbooks/callback] Intuit token exchange response", {
      ok: tokenResponse.ok,
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      payload: tokenResponse.payload,
      raw: tokenResponse.raw,
    });

    if (!tokenResponse.ok) {
      return NextResponse.json(
        {
          error: tokenResponse.payload?.error || "quickbooks_token_exchange_failed",
          description: tokenResponse.payload?.error_description || tokenResponse.raw,
        },
        { status: tokenResponse.status || 500 },
      );
    }

    const token = tokenResponse.payload;

    console.log("[quickbooks/callback] token exchange succeeded", {
      userId: authData.user.id,
      realmId,
      hasAccessToken: Boolean(token?.access_token),
      accessTokenLength: token?.access_token?.length || 0,
      hasRefreshToken: Boolean(token?.refresh_token),
      refreshTokenLength: token?.refresh_token?.length || 0,
      expiresIn: token?.expires_in || null,
    });

    console.log("[quickbooks/callback] saving QuickBooks tokens to Supabase", {
      userId: authData.user.id,
      realmId,
      table: "erp_connections",
      platform: "quickbooks",
    });

    const savedConnection = await adapter.saveConnection({
      realmId,
      token,
    });

    console.log("[quickbooks/callback] Supabase save succeeded", {
      connectionId: savedConnection?.id || null,
      userId: savedConnection?.user_id || authData.user.id,
      realmId: savedConnection?.realm_id || realmId,
      tokenExpiry: savedConnection?.token_expiry || null,
      updatedAt: savedConnection?.updated_at || null,
    });

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("qb_oauth_state");
    response.cookies.delete("qb_oauth_token");
    return response;
  } catch (error) {
    console.error("[quickbooks/callback] OAuth callback failed", {
      message: error?.message,
      stack: error?.stack,
      code: error?.error || error?.code,
      description: error?.error_description,
      intuitTid: error?.intuit_tid,
      fullError: error,
    });
    return NextResponse.json({ error: error?.message || "QuickBooks OAuth callback failed" }, { status: 500 });
  }
}
