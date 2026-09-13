import { NextResponse } from "next/server";
import {
  AccountingConnectionSelectionError,
  accountingConnectionSelectionErrorBody,
  getActiveAccountingContext,
} from "../../../../lib/integrations/accounting";
import {
  isAccountingPrincipalDenial,
  resolveAccountingRequestPrincipal,
} from "../../../../lib/integrations/accounting/resolve-request-principal";
import { rateLimit } from "../../../../lib/rate-limit";

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "accounting-active-context", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const principal = await resolveAccountingRequestPrincipal({ request, body });
    if (isAccountingPrincipalDenial(principal)) {
      return NextResponse.json(principal.body, { status: principal.status });
    }

    const companyId = body.companyId || body.company_id || null;
    const connectionId = String(body.connectionId || body.connection_id || "");
    const sourceSystem = String(body.sourceSystem || body.source_system || "");
    const tenantOrRealmId =
      body.tenantOrRealmId || body.tenant_or_realm_id || body.tenantId || body.tenant_id || null;
    const forceRefresh = Boolean(body.forceRefresh || body.force_refresh);

    const context = await getActiveAccountingContext({
      companyId,
      connectionId,
      sourceSystem,
      tenantOrRealmId,
      userId: principal.userId,
      forceRefresh,
    });
    if (!context) return NextResponse.json({ error: "No active accounting context found" }, { status: 404 });
    return NextResponse.json({ ok: true, activeContext: context, ...context });
  } catch (error) {
    if (error instanceof AccountingConnectionSelectionError) {
      return NextResponse.json(accountingConnectionSelectionErrorBody(error), { status: error.httpStatus });
    }
    console.error("[accounting/active-context] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to load active accounting context" }, { status: 500 });
  }
}
