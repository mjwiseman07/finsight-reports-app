import { NextResponse } from "next/server";
import { getERPAdapter } from "../../../../lib/erp-adapters";
import { supabaseAdmin } from "../../../../lib/supabase";
import { resolveEntitlementsForSubject } from "../../../../lib/entitlements";
import { parseOfferingSku, parseSubscriptionStatus } from "@/lib/erp/quickbooks/qbo-editions";
import { withAutoFile } from "../../../../lib/support/api-error-wrapper";

function getQuickBooksTokenExpiry(token) {
  const expiresInSeconds = Number(token?.expires_in || 3600);
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

async function saveLeadQuickBooksAccountingConnection({ leadId, realmId, token, companyProfile }) {
  const companyName = companyProfile.legal_name || companyProfile.company_name || "QuickBooks Company";
  const now = new Date().toISOString();
  const payload = {
    user_id: leadId,
    provider: "quickbooks",
    provider_family: "intuit",
    provider_product: "quickbooks_online",
    external_entity_id: `qbo:${realmId}`,
    external_entity_name: companyName,
    access_token: token.access_token,
    refresh_token: token.refresh_token,
    token_expires_at: getQuickBooksTokenExpiry(token),
    tenant_or_realm_id: realmId,
    scopes: ["com.intuit.quickbooks.accounting"],
    status: "connected",
    // Phase MC-1 (Issue #6, Gap DB-1): first-class home currency column.
    home_currency: companyProfile.home_currency || null,
    // Phase Q7 (Issue #7): normalized edition + subscription status.
    qbo_edition: parseOfferingSku(companyProfile.qbo_edition_raw),
    qbo_subscription_status: parseSubscriptionStatus(companyProfile.qbo_subscription_status_raw),
    metadata_json: {
      lead_id: leadId,
      realm_id: realmId,
      company_name: companyName,
      tenant_name: companyName,
      source_system: "quickbooks",
      active_provider: "quickbooks",
      connected_at: now,
      oauth_mode: "lead",
      // Phase MC-1 (Issue #6): currency context mirrored for callers that read metadata_json.
      home_currency: companyProfile.home_currency || null,
      multicurrency_enabled: Boolean(companyProfile.multicurrency_enabled),
      // Phase Q7 (Issue #7): mirror edition context into metadata_json for
      // callers reading from JSON.
      qbo_edition: parseOfferingSku(companyProfile.qbo_edition_raw),
      qbo_subscription_status: parseSubscriptionStatus(companyProfile.qbo_subscription_status_raw),
      qbo_edition_raw: companyProfile.qbo_edition_raw || null,
      qbo_subscription_status_raw: companyProfile.qbo_subscription_status_raw || null,
    },
    updated_at: now,
  };

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("accounting_connections")
    .select("id, metadata_json")
    .eq("user_id", leadId)
    .eq("provider", "quickbooks")
    .eq("external_entity_id", `qbo:${realmId}`)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const result = existing?.id
    ? await supabaseAdmin
        .from("accounting_connections")
        .update({
          ...payload,
          metadata_json: {
            ...(existing.metadata_json || {}),
            ...payload.metadata_json,
          },
        })
        .eq("id", existing.id)
        .select("id, user_id, provider, tenant_or_realm_id, external_entity_name, status")
        .single()
    : await supabaseAdmin
        .from("accounting_connections")
        .insert({
          ...payload,
          created_at: now,
        })
        .select("id, user_id, provider, tenant_or_realm_id, external_entity_name, status")
        .single();

  if (result.error) throw result.error;
  return result.data;
}

/**
 * Phase TCP1 W3 — Tier-aware post-connect landing.
 * Respects explicit returnTo cookie when set (user came from a specific
 * onboarding step). Otherwise picks the correct default per tier:
 *   review_assist   -> /reviewer/queue
 *   solo_bookkeeper -> /dashboard
 *   anything else   -> /dashboard (legacy default)
 */
async function resolvePostConnectLanding(userId, returnTo) {
  if (returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  if (!userId) return "/dashboard";
  try {
    const entitlements = await resolveEntitlementsForSubject(userId);
    if (entitlements?.tier_key === "review_assist") return "/reviewer/queue";
    return "/dashboard";
  } catch (err) {
    console.warn("[quickbooks/callback] tier resolution failed, defaulting to /dashboard", {
      message: err?.message,
    });
    return "/dashboard";
  }
}

/**
 * Phase TCP1 W3 — Every error path redirects to /onboarding?qbError=<code>
 * so the user sees a friendly banner instead of raw JSON. Cookies are cleaned
 * up on the redirect so a retry starts fresh.
 */
function redirectWithQbError(request, code, extraParams = {}) {
  const url = new URL("/onboarding", request.url);
  url.searchParams.set("qbError", code);
  for (const [k, v] of Object.entries(extraParams)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const response = NextResponse.redirect(url);
  response.cookies.delete("qb_oauth_state");
  response.cookies.delete("qb_oauth_mode");
  response.cookies.delete("qb_oauth_token");
  response.cookies.delete("qb_oauth_lead_id");
  response.cookies.delete("qb_oauth_return_to");
  return response;
}

async function getImpl(request) {
  const url = new URL(request.url);
  const authCode = url.searchParams.get("code") || "";
  const state = url.searchParams.get("state") || "";
  const intuitError = url.searchParams.get("error") || "";
  const intuitErrorDescription = url.searchParams.get("error_description") || "";
  const realmId = url.searchParams.get("realmId") || "";
  const configAdapter = getERPAdapter("quickbooks", null);
  const quickBooksConfig = configAdapter.getConfig();
  const expectedState = request.cookies.get("qb_oauth_state")?.value || "";
  const oauthMode = request.cookies.get("qb_oauth_mode")?.value || "user";
  const supabaseToken = request.cookies.get("qb_oauth_token")?.value || "";
  const leadId = request.cookies.get("qb_oauth_lead_id")?.value || "";
  const returnTo = request.cookies.get("qb_oauth_return_to")?.value || "";

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
    return redirectWithQbError(request, "intuit_denied", { intuitError });
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
    return redirectWithQbError(request, "state_mismatch");
  }

  if (!authCode || !realmId) {
    console.error("[quickbooks/callback] missing required callback values", {
      hasAuthCode: Boolean(authCode),
      hasRealmId: Boolean(realmId),
    });
    return redirectWithQbError(request, "missing_callback_values");
  }

  if (!supabaseAdmin) {
    console.error("[quickbooks/callback] Supabase admin client is not configured");
    return redirectWithQbError(request, "missing_admin_client");
  }

  try {
    console.log("[quickbooks/callback] OAuth exchange config", {
      hasClientId: Boolean(quickBooksConfig.clientId),
      hasClientSecret: Boolean(quickBooksConfig.clientSecret),
      environment: quickBooksConfig.environment,
      hasRedirectUri: Boolean(quickBooksConfig.redirectUri),
      redirectUriValue: quickBooksConfig.redirectUri || null,
    });

    // Adapter API: exchangeAuthorizationCode(code) → { ok, status, payload }
    // (paste suggested { code } object API; production adapter takes a string).
    let token;
    try {
      const tokenResponse = await configAdapter.exchangeAuthorizationCode(authCode);
      if (!tokenResponse.ok) {
        console.error("[quickbooks/callback] token exchange failed", {
          message: tokenResponse.payload?.error_description || tokenResponse.payload?.error,
          code: tokenResponse.payload?.error,
          status: tokenResponse.status,
        });
        return redirectWithQbError(request, "token_exchange_failed");
      }
      token = tokenResponse.payload;
    } catch (exchangeErr) {
      console.error("[quickbooks/callback] token exchange failed", {
        message: exchangeErr?.message,
        code: exchangeErr?.error || exchangeErr?.code,
        intuitTid: exchangeErr?.intuit_tid,
      });
      return redirectWithQbError(request, "token_exchange_failed");
    }

    // Adapter API: getCompanyProfile(accessToken, realmId)
    const companyProfile = await configAdapter
      .getCompanyProfile(token.access_token, realmId)
      .catch(() => ({}));

    if (oauthMode === "lead") {
      let savedAccountingConnection;
      try {
        savedAccountingConnection = await saveLeadQuickBooksAccountingConnection({
          leadId,
          realmId,
          token,
          companyProfile,
        });
      } catch (saveErr) {
        console.error("[quickbooks/callback] lead connection save failed", {
          message: saveErr?.message,
          code: saveErr?.code,
        });
        return redirectWithQbError(request, "connection_save_failed");
      }

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
              token_stored: true,
              accounting_connection_id: savedAccountingConnection.id,
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

      console.log("[quickbooks/callback] lead flow — saved accounting connection", {
        accountingConnectionId: savedAccountingConnection.id,
        leadId,
        realmId,
        status: savedAccountingConnection.status,
      });

      // Lead flow always lands on /free-review (existing behavior) — leads
      // don't have a resolved tier yet.
      const leadLanding =
        returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
          ? returnTo
          : "/free-review";
      const redirectUrl = new URL(leadLanding, request.url);
      redirectUrl.searchParams.set("quickBooksConnected", "true");
      redirectUrl.searchParams.set("leadId", leadId);
      redirectUrl.searchParams.set("connectionId", savedAccountingConnection.id);
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
      return redirectWithQbError(request, "invalid_supabase_token");
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
    let savedConnection;
    try {
      savedConnection = await userAdapter.saveConnection({
        realmId,
        token,
      });
    } catch (saveErr) {
      console.error("[quickbooks/callback] user connection save failed", {
        message: saveErr?.message,
        code: saveErr?.code,
      });
      return redirectWithQbError(request, "connection_save_failed");
    }

    console.log("[quickbooks/callback] Supabase save succeeded", {
      connectionId: savedConnection?.id || null,
      userId: savedConnection?.user_id || authData.user.id,
      tokenExpiry: savedConnection?.token_expiry || null,
      updatedAt: savedConnection?.updated_at || null,
    });

    // Phase TCP1 W3 — tier-aware landing.
    const landing = await resolvePostConnectLanding(authData.user.id, returnTo);
    const redirectUrl = new URL(landing, request.url);
    redirectUrl.searchParams.set("quickBooksConnected", "true");
    if (savedConnection?.id) redirectUrl.searchParams.set("connectionId", savedConnection.id);
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
    return redirectWithQbError(request, "token_exchange_failed");
  }
}

export const GET = withAutoFile(getImpl, { source: "internal" });
