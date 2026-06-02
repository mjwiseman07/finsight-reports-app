import { NextResponse } from "next/server";
import { getAccountingProvider } from "../../../../../lib/integrations/accounting";
import { decryptAccountingToken } from "../../../../../lib/integrations/accounting/token-encryption";
import { rateLimit } from "../../../../../lib/rate-limit";
import { supabaseAdmin } from "../../../../../lib/supabase";

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "xero-select-lead-entity", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (!supabaseAdmin) return NextResponse.json({ error: "Supabase admin client is not configured" }, { status: 500 });

    const body = await request.json().catch(() => ({}));
    const requestedLeadId = String(body.leadId || body.lead_id || "");
    const entityId = String(body.entityId || body.entity_id || "");
    const cookieLeadId = request.cookies.get("xero_lead_id")?.value || "";
    const cookieConnectionId = request.cookies.get("xero_lead_connection_id")?.value || "";
    const encryptedAccessToken = request.cookies.get("xero_lead_access_token")?.value || "";
    const accessToken = decryptAccountingToken(encryptedAccessToken);

    if (!requestedLeadId || !entityId || !cookieLeadId || requestedLeadId !== cookieLeadId || !accessToken) {
      return NextResponse.json({ error: "Xero organization authorization expired. Reconnect Xero, then choose the organization." }, { status: 401 });
    }

    const provider = getAccountingProvider("xero");
    const entity = await provider.selectEntity({
      entityId,
      connection: {
        id: `lead:${requestedLeadId}`,
        user_id: requestedLeadId,
        provider: "xero",
        provider_family: "xero",
        provider_product: "xero_accounting",
        external_entity_id: null,
        external_entity_name: null,
        access_token: accessToken,
        refresh_token: null,
        token_expires_at: null,
        tenant_or_realm_id: null,
        scopes: [],
        status: "needs_entity_selection",
        metadata_json: {},
      },
    });

    const { data: lead } = await supabaseAdmin
      .from("free_review_leads")
      .select("additional_business_information")
      .eq("id", requestedLeadId)
      .maybeSingle();

    const additionalBusinessInformation =
      lead?.additional_business_information && typeof lead.additional_business_information === "object"
        ? lead.additional_business_information
        : {};

    const selectedAt = new Date().toISOString();
    const { data: existingConnections, error: connectionLookupError } = await supabaseAdmin
      .from("accounting_connections")
      .select("id, metadata_json")
      .eq("user_id", requestedLeadId)
      .eq("provider", "xero")
      .order("updated_at", { ascending: false })
      .limit(1);
    if (connectionLookupError) throw connectionLookupError;
    const connectionId = cookieConnectionId || existingConnections?.[0]?.id || "";
    if (connectionId) {
      const existingMetadata = existingConnections?.[0]?.metadata_json && typeof existingConnections[0].metadata_json === "object"
        ? existingConnections[0].metadata_json
        : {};
      const { error: connectionUpdateError } = await supabaseAdmin
        .from("accounting_connections")
        .update({
          external_entity_id: entity.canonicalId,
          external_entity_name: entity.name,
          tenant_or_realm_id: entity.tenantOrRealmId || entity.externalId,
          status: "connected",
          metadata_json: {
            ...existingMetadata,
            source_system: "xero",
            active_provider: "xero",
            company_id: requestedLeadId,
            tenant_id: entity.tenantOrRealmId || entity.externalId,
            tenant_name: entity.name,
            selected_at: selectedAt,
            last_synced_at: selectedAt,
          },
          updated_at: selectedAt,
        })
        .eq("id", connectionId);
      if (connectionUpdateError) throw connectionUpdateError;
    }

    const { error } = await supabaseAdmin
      .from("free_review_leads")
      .update({
        legal_company_name: entity.name,
        status: "xero_connected",
        additional_business_information: {
          ...additionalBusinessInformation,
          accounting_system: "Xero",
          data_source: "Xero",
          xero: {
            tenant_id: entity.externalId,
            tenant_name: entity.name,
            connection_id: connectionId || null,
            selected_at: selectedAt,
            token_stored: Boolean(connectionId),
          },
        },
        updated_at: selectedAt,
      })
      .eq("id", requestedLeadId);

    if (error) throw error;

    const response = NextResponse.json({ entity, connectionId: connectionId || null });
    response.cookies.set("xero_lead_access_token", "", { path: "/", maxAge: 0 });
    response.cookies.set("xero_lead_id", "", { path: "/", maxAge: 0 });
    response.cookies.set("xero_lead_connection_id", "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("[integrations/xero/select-lead-entity] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to select Xero organization." }, { status: 500 });
  }
}
