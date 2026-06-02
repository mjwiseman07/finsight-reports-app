import { NextResponse } from "next/server";
import { getAccountingProvider, handleCallback } from "../../../../../lib/integrations/accounting";
import { supabaseAdmin } from "../../../../../lib/supabase";
import { encryptAccountingToken } from "../../../../../lib/integrations/accounting/token-encryption";

function getTokenExpiry(tokenPayload) {
  const expiresInSeconds = Number(tokenPayload.expires_in || 3600);
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

async function saveLeadXeroConnection({ leadId, tokenPayload, selectedEntity, entities }) {
  const connectedAt = new Date().toISOString();
  const tenantId = selectedEntity?.tenantOrRealmId || selectedEntity?.externalId || null;
  const tenantName = selectedEntity?.name || null;
  const connectionPayload = {
    user_id: leadId,
    provider: "xero",
    provider_family: "xero",
    provider_product: "xero_accounting",
    external_entity_id: tenantId ? `xero:${tenantId}` : null,
    external_entity_name: tenantName,
    access_token: typeof tokenPayload.access_token === "string" ? encryptAccountingToken(tokenPayload.access_token) : null,
    refresh_token: typeof tokenPayload.refresh_token === "string" ? encryptAccountingToken(tokenPayload.refresh_token) : null,
    token_expires_at: getTokenExpiry(tokenPayload),
    tenant_or_realm_id: tenantId,
    scopes: String(tokenPayload.scope || "").split(" ").filter(Boolean),
    status: tenantId ? "connected" : "needs_entity_selection",
    metadata_json: {
      token_type: tokenPayload.token_type || null,
      source_system: "xero",
      active_provider: "xero",
      company_id: leadId,
      tenant_id: tenantId,
      tenant_name: tenantName,
      available_organizations: entities.map((entity) => ({
        tenant_id: entity.externalId,
        tenant_name: entity.name,
      })),
      connected_at: connectedAt,
      last_synced_at: connectedAt,
      tokens_encrypted: true,
      lead_mode: true,
    },
    updated_at: connectedAt,
  };

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("accounting_connections")
    .select("id")
    .eq("user_id", leadId)
    .eq("provider", "xero")
    .order("updated_at", { ascending: false })
    .limit(1);
  if (existingError) throw existingError;

  const query = existing?.[0]?.id
    ? supabaseAdmin
        .from("accounting_connections")
        .update(connectionPayload)
        .eq("id", existing[0].id)
        .select("id")
        .limit(1)
    : supabaseAdmin
        .from("accounting_connections")
        .insert(connectionPayload)
        .select("id")
        .limit(1);
  const { data, error } = await query;
  if (error) throw error;
  return data?.[0]?.id || existing?.[0]?.id || "";
}

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const providerError = requestUrl.searchParams.get("error") || "";

  if (providerError) {
    return NextResponse.json(
      {
        error: providerError,
        description: requestUrl.searchParams.get("error_description") || "",
      },
      { status: 400 },
    );
  }

  try {
    console.log("XERO CALLBACK HIT");
    const oauthMode = request.cookies.get("xero_oauth_mode")?.value || "";
    if (oauthMode === "lead") {
      if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });

      const expectedState = request.cookies.get("xero_oauth_state")?.value || "";
      const leadId = request.cookies.get("xero_oauth_lead_id")?.value || "";
      const returnTo = request.cookies.get("xero_oauth_return_to")?.value || "/onboarding";
      const code = requestUrl.searchParams.get("code") || "";
      const state = requestUrl.searchParams.get("state") || "";

      if (!code || !state || !expectedState || state !== expectedState || !leadId) {
        return NextResponse.json({ error: "Missing or invalid Xero OAuth state" }, { status: 400 });
      }

      const provider = getAccountingProvider("xero");
      const token = await provider.exchangeCodeForTokens({ code, state });
      console.log("TOKEN EXCHANGE SUCCESS");
      const tokenPayload = token || {};
      const entities = await provider.getEntities({
        connection: {
          id: `lead:${leadId}`,
          user_id: leadId,
          provider: "xero",
          provider_family: "xero",
          provider_product: "xero_accounting",
          external_entity_id: null,
          external_entity_name: null,
          access_token: typeof tokenPayload.access_token === "string" ? tokenPayload.access_token : null,
          refresh_token: typeof tokenPayload.refresh_token === "string" ? tokenPayload.refresh_token : null,
          token_expires_at: null,
          tenant_or_realm_id: null,
          scopes: String(tokenPayload.scope || "").split(" ").filter(Boolean),
          status: "connected",
          metadata_json: {},
        },
      });
      console.log("CONNECTIONS API SUCCESS");
      const selectedEntity = entities.length === 1 ? entities[0] : null;
      console.log("TENANT ID", selectedEntity?.externalId || null);
      console.log("TENANT NAME", selectedEntity?.name || null);
      const connectionId = await saveLeadXeroConnection({ leadId, tokenPayload, selectedEntity, entities });
      console.log("CONNECTION SAVED SUCCESSFULLY", { connectionId });
      const xeroConnectionStatus = selectedEntity ? "xero_connected" : "xero_connected_needs_organization_selection";

      const { error: leadError } = await supabaseAdmin
        .from("free_review_leads")
        .update({
          status: xeroConnectionStatus,
          additional_business_information: {
            xero: {
              tenant_id: selectedEntity?.externalId || null,
              tenant_name: selectedEntity?.name || null,
              connection_id: connectionId,
              organization_count: entities.length,
              available_organizations: entities.map((entity) => ({
                tenant_id: entity.externalId,
                tenant_name: entity.name,
              })),
              requires_organization_selection: !selectedEntity,
              connected_at: new Date().toISOString(),
              token_stored: false,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (leadError) {
        console.error("[integrations/xero/callback] failed to enrich free review lead", {
          leadId,
          message: leadError.message,
        });
      }

      const redirectUrl = new URL(returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/onboarding", request.url);
      redirectUrl.searchParams.set("accountingConnected", "true");
      redirectUrl.searchParams.set("provider", "xero");
      redirectUrl.searchParams.set("xeroConnected", "true");
      redirectUrl.searchParams.set("leadId", leadId);
      if (connectionId) redirectUrl.searchParams.set("connectionId", connectionId);
      if (selectedEntity?.name) redirectUrl.searchParams.set("organizationName", selectedEntity.name);
      if (!selectedEntity) {
        redirectUrl.searchParams.set("xeroOrganizationSelection", "required");
        redirectUrl.searchParams.set("xeroOrganizationCount", String(entities.length));
      }
      const response = NextResponse.redirect(redirectUrl);
      const leadCookieOptions = {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 10 * 60,
        path: "/",
      };
      if (typeof tokenPayload.access_token === "string") {
        response.cookies.set("xero_lead_access_token", encryptAccountingToken(tokenPayload.access_token) || "", leadCookieOptions);
      }
      response.cookies.set("xero_lead_id", leadId, leadCookieOptions);
      if (connectionId) response.cookies.set("xero_lead_connection_id", connectionId, leadCookieOptions);
      response.cookies.delete("xero_oauth_state");
      response.cookies.delete("xero_oauth_mode");
      response.cookies.delete("xero_oauth_lead_id");
      response.cookies.delete("xero_oauth_return_to");
      return response;
    }

    const result = await handleCallback("xero", requestUrl);
    const redirectUrl = new URL(result.returnTo || "/dashboard", request.url);
    redirectUrl.searchParams.set("accountingConnected", "true");
    redirectUrl.searchParams.set("provider", "xero");
    redirectUrl.searchParams.set("xeroOrganizationSelection", "required");
    if (result.connectionId) redirectUrl.searchParams.set("connectionId", result.connectionId);
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[integrations/xero/callback] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Xero OAuth callback failed" }, { status: 500 });
  }
}
