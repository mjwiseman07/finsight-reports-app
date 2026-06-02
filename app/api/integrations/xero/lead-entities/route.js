import { NextResponse } from "next/server";
import { getAccountingProvider } from "../../../../../lib/integrations/accounting";
import { decryptAccountingToken } from "../../../../../lib/integrations/accounting/token-encryption";
import { rateLimit } from "../../../../../lib/rate-limit";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "xero-lead-entities", limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const url = new URL(request.url);
    const requestedLeadId = url.searchParams.get("leadId") || "";
    const cookieLeadId = request.cookies.get("xero_lead_id")?.value || "";
    const encryptedAccessToken = request.cookies.get("xero_lead_access_token")?.value || "";
    const accessToken = decryptAccountingToken(encryptedAccessToken);

    if (!requestedLeadId || !cookieLeadId || requestedLeadId !== cookieLeadId || !accessToken) {
      return NextResponse.json({ error: "Xero organization authorization expired. Reconnect Xero, then choose the organization." }, { status: 401 });
    }

    const provider = getAccountingProvider("xero");
    const entities = await provider.getEntities({
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

    return NextResponse.json({ entities });
  } catch (error) {
    console.error("[integrations/xero/lead-entities] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to load Xero organizations." }, { status: 500 });
  }
}
