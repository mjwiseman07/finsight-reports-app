import { NextResponse } from "next/server";
import {
  AccountingConnectionSelectionError,
  accountingConnectionSelectionErrorBody,
  getActiveAccountingContext,
} from "../../../../lib/integrations/accounting";
import { buildScheduleDiagnostics } from "../../../../lib/accounting/supporting-schedules/scheduleDiagnostics";
import {
  isAccountingPrincipalDenial,
  resolveAccountingRequestPrincipal,
} from "../../../../lib/integrations/accounting/resolve-request-principal";
import { rateLimit } from "../../../../lib/rate-limit";

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "accounting-schedule-diagnostics", limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const principal = await resolveAccountingRequestPrincipal({ request });
    if (isAccountingPrincipalDenial(principal)) {
      return NextResponse.json(principal.body, { status: principal.status });
    }

    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") || "";
    const connectionId = url.searchParams.get("connectionId") || "";
    const sourceSystem = url.searchParams.get("sourceSystem") || "";
    const tenantOrRealmId =
      url.searchParams.get("tenantOrRealmId") ||
      url.searchParams.get("tenant_or_realm_id") ||
      url.searchParams.get("tenantId") ||
      "";

    const context = await getActiveAccountingContext({
      companyId,
      connectionId,
      sourceSystem,
      tenantOrRealmId,
      userId: principal.userId,
      forceRefresh: false,
    });
    if (!context?.normalizedData) return NextResponse.json({ error: "No active accounting context found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      ...buildScheduleDiagnostics(context.normalizedData),
    });
  } catch (error) {
    if (error instanceof AccountingConnectionSelectionError) {
      return NextResponse.json(accountingConnectionSelectionErrorBody(error), { status: error.httpStatus });
    }
    console.error("[accounting/schedule-diagnostics] failed", { message: error?.message });
    return NextResponse.json({ error: error?.message || "Unable to load schedule diagnostics" }, { status: 500 });
  }
}
