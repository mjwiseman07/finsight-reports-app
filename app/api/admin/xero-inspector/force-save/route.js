import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { buildAdvisacorNormalizedFinancialData, persistNormalizedAccountingSync } from "../../../../../lib/integrations/accounting";
import { xeroAccountingProvider } from "../../../../../lib/integrations/accounting/providers/xero";
import { decryptAccountingToken } from "../../../../../lib/integrations/accounting/token-encryption";
import { supabaseAdmin } from "../../../../../lib/supabase";
import { rateLimit } from "../../../../../lib/rate-limit";

function latestCompletedMonth() {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

async function loadActiveXeroConnection() {
  if (!supabaseAdmin) throw new Error("Supabase admin client is not configured.");
  const { data, error } = await supabaseAdmin
    .from("accounting_connections")
    .select("*")
    .eq("provider", "xero")
    .in("status", ["connected", "needs_entity_selection"])
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

export async function POST(request) {
  const rateLimitResponse = rateLimit(request, { key: "admin-xero-inspector-force-save", limit: 6, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const connection = await loadActiveXeroConnection();
    if (!connection) throw new Error("No active Xero connection found.");
    const tenantId = connection.tenant_or_realm_id || String(connection.external_entity_id || "").replace(/^xero:/, "");
    const tenantName = connection.external_entity_name || String(connection.metadata_json?.tenant_name || "Xero Organization");
    const accessToken = decryptAccountingToken(connection.access_token);
    if (!tenantId) throw new Error("Active Xero connection is missing tenantId.");
    if (!accessToken) throw new Error("Active Xero connection is missing a usable encrypted access token.");

    const reportPeriod = latestCompletedMonth();
    const syncId = randomUUID();
    const decryptedConnection = {
      ...connection,
      access_token: accessToken,
      refresh_token: decryptAccountingToken(connection.refresh_token),
    };
    const bundle = await xeroAccountingProvider.getPrimaryFinancialReports({
      connection: decryptedConnection,
      dateRange: reportPeriod,
    });
    const normalizedData = buildAdvisacorNormalizedFinancialData({
      connection: decryptedConnection,
      bundle,
      adapterName: "xeroAdapter",
      syncId,
      reportPeriod,
      tenantId,
      tenantName,
    });
    const diagnostics = {
      sourceSystem: "xero",
      tenantName,
      accountsCount: normalizedData.normalizedAccounts?.length || 0,
      trialBalanceCount: normalizedData.normalizedTrialBalance?.length || 0,
      balanceSheetCount: normalizedData.normalizedBalanceSheet?.length || 0,
      incomeStatementCount: normalizedData.normalizedIncomeStatement?.length || 0,
    };
    console.info("NORMALIZATION COMPLETE", {
      companyId: normalizedData.companyId || String(connection.metadata_json?.company_id || connection.user_id || ""),
      connectionId: connection.id,
      tenantId,
      tenantName,
      sourceSystem: "xero",
      reportPeriod,
    });
    const persisted = await persistNormalizedAccountingSync({
      connection: decryptedConnection,
      userId: connection.user_id,
      syncId,
      reportPeriod,
      normalizedData,
      diagnostics,
      sourceSystem: "xero",
      adapterName: "xeroAdapter",
      tenantId,
      tenantName,
      preflight: { forcedFromInspector: true },
    });

    const redirectUrl = new URL("/admin/xero-inspector", request.url);
    redirectUrl.searchParams.set("forceSave", "success");
    redirectUrl.searchParams.set("syncId", persisted.syncId);
    redirectUrl.searchParams.set("syncStatus", persisted.syncStatus);
    return NextResponse.redirect(redirectUrl, 303);
  } catch (error) {
    console.error("[admin/xero-inspector/force-save] failed", { message: error?.message });
    const redirectUrl = new URL("/admin/xero-inspector", request.url);
    redirectUrl.searchParams.set("forceSave", "failed");
    redirectUrl.searchParams.set("error", error?.message || "Unable to force save Xero sync");
    return NextResponse.redirect(redirectUrl, 303);
  }
}
