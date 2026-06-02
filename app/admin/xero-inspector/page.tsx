import { buildAdvisacorNormalizedFinancialData } from "../../../lib/integrations/accounting/advisacor-data-model";
import { getLatestNormalizedAccountingData } from "../../../lib/integrations/accounting/service";
import { xeroAccountingProvider } from "../../../lib/integrations/accounting/providers/xero";
import { decryptAccountingToken } from "../../../lib/integrations/accounting/token-encryption";
import type { AccountingConnectionRecord, AccountingDateRange } from "../../../lib/integrations/accounting/types";
import { supabaseAdmin } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

type RowValue = string | number | boolean | null | undefined;
type DisplayRow = Record<string, RowValue>;

type XeroApiResult = {
  statusCode: number | null;
  ok: boolean;
  error: string | null;
  payload: Record<string, unknown>;
};

function latestCompletedMonth(): AccountingDateRange {
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
  return (data?.[0] as AccountingConnectionRecord | undefined) || null;
}

async function xeroGet({ accessToken, tenantId, path }: { accessToken: string; tenantId: string; path: string }): Promise<XeroApiResult> {
  try {
    const response = await fetch(`https://api.xero.com/api.xro/2.0/${path}`, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "xero-tenant-id": tenantId,
        Accept: "application/json",
      },
    });
    const payload = await response.json().catch(() => ({}));
    return {
      statusCode: response.status,
      ok: response.ok,
      error: response.ok ? null : String(payload?.Message || payload?.Detail || payload?.ErrorNumber || "Xero request failed"),
      payload,
    };
  } catch (error) {
    return {
      statusCode: null,
      ok: false,
      error: error instanceof Error ? error.message : "Xero request failed",
      payload: {},
    };
  }
}

function reportRows(payload: Record<string, unknown>) {
  const reports = Array.isArray(payload.Reports) ? payload.Reports : [];
  const firstReport = reports[0] as Record<string, unknown> | undefined;
  return Array.isArray(firstReport?.Rows) ? firstReport.Rows : [];
}

function flattenRows(rows: unknown[] = [], flattened: unknown[] = []) {
  for (const row of rows) {
    flattened.push(row);
    const record = row as Record<string, unknown>;
    if (Array.isArray(record.Rows)) flattenRows(record.Rows, flattened);
  }
  return flattened;
}

function cellValue(cell: unknown) {
  const record = cell as Record<string, unknown> | undefined;
  return String(record?.Value ?? record?.value ?? "");
}

function attributeValue(cell: unknown, idPattern: RegExp) {
  const record = cell as Record<string, unknown> | undefined;
  const attributes = Array.isArray(record?.Attributes) ? record.Attributes as Array<Record<string, unknown>> : [];
  const match = attributes.find((attribute) => idPattern.test(String(attribute.Id || attribute.id || "")));
  return match ? String(match.Value ?? match.value ?? "") : "";
}

function safeValue(value: RowValue) {
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
}

function rawAccountRows(accounts: unknown[]): DisplayRow[] {
  return accounts.slice(0, 20).map((account) => {
    const record = account as Record<string, unknown>;
    return {
      AccountID: String(record.AccountID || record.accountId || record.Id || record.id || ""),
      Code: String(record.Code || record.code || ""),
      Name: String(record.Name || record.name || ""),
      Type: String(record.Type || record.type || ""),
      Class: String(record.Class || record.class || ""),
      Status: String(record.Status || record.status || ""),
    };
  });
}

function rawTrialBalanceRows(rows: unknown[]): DisplayRow[] {
  return rows.slice(0, 20).map((row) => {
    const record = row as Record<string, unknown>;
    const cells = Array.isArray(record.Cells) ? record.Cells : [];
    const firstCell = cells[0];
    return {
      RowType: String(record.RowType || ""),
      Title: String(record.Title || ""),
      Label: cellValue(firstCell) || String(record.Title || ""),
      AccountID: attributeValue(firstCell, /accountid|account_id|account/i),
      AccountCode: attributeValue(firstCell, /accountcode|account_code|code/i),
      CellValues: cells.map(cellValue).filter(Boolean).slice(0, 8).join(" | "),
    };
  });
}

function mappedAccountRows(rows: Array<Record<string, unknown>>): DisplayRow[] {
  return rows.slice(0, 20).map((row) => ({
    id: row.id as RowValue,
    name: row.name as RowValue,
    accountNumber: row.accountNumber as RowValue,
    accountType: row.accountType as RowValue,
    accountClass: row.accountClass as RowValue,
    status: row.status as RowValue,
  }));
}

function mappedTrialBalanceRows(rows: Array<Record<string, unknown>>): DisplayRow[] {
  return rows.slice(0, 20).map((row) => ({
    accountId: row.accountId as RowValue,
    accountName: row.accountName as RowValue,
    debit: row.debit as RowValue,
    credit: row.credit as RowValue,
    netAmount: row.netAmount as RowValue,
  }));
}

function DataCard({ label, value }: { label: string; value: RowValue }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-lg font-black text-white">{safeValue(value)}</p>
    </div>
  );
}

function InspectorTable({ title, rows }: { title: string; rows: DisplayRow[] }) {
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">First 20 records. Tokens, secrets, and raw full payloads are not shown.</p>
      {rows.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-slate-400">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="border-b border-white/10 px-3 py-2">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-b border-white/5">
                  {columns.map((column) => (
                    <td key={column} className="px-3 py-2">{safeValue(row[column])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100">
          No records available.
        </p>
      )}
    </section>
  );
}

export default async function XeroInspectorPage() {
  let error = "";
  let mappingError = "";
  let connection: AccountingConnectionRecord | null = null;
  let tenantId = "";
  let accessToken = "";
  let rawAccounts: unknown[] = [];
  let rawTrialBalanceFlattened: unknown[] = [];
  let trialBalanceApiRowCount = 0;
  let balanceSheetApiRowCount = 0;
  let profitAndLossApiRowCount = 0;
  let accountsApiStatus: RowValue = "-";
  let accountsApiError = "";
  let trialBalanceApiStatus: RowValue = "-";
  let trialBalanceApiError = "";
  let balanceSheetApiStatus: RowValue = "-";
  let balanceSheetApiError = "";
  let profitAndLossApiStatus: RowValue = "-";
  let profitAndLossApiError = "";
  let normalizedAccounts: Array<Record<string, unknown>> = [];
  let normalizedTrialBalance: Array<Record<string, unknown>> = [];
  let normalizedBalanceSheet: Array<Record<string, unknown>> = [];
  let normalizedIncomeStatement: Array<Record<string, unknown>> = [];
  let reportMappingDiagnostics: Record<string, { rawCount?: number; mappedCount?: number; error?: string | null }> = {};
  const reportPeriod = latestCompletedMonth();

  try {
    connection = await loadActiveXeroConnection();
    console.log("[admin/xero-inspector] active connection found?", Boolean(connection));
    if (!connection) {
      error = "No active Xero connection found. Connect and select a Xero organization, then reload this page.";
    } else {
      tenantId = connection.tenant_or_realm_id || connection.external_entity_id?.replace(/^xero:/, "") || "";
      accessToken = decryptAccountingToken(connection.access_token) || "";
      console.log("[admin/xero-inspector] connectionId", connection.id);
      console.log("[admin/xero-inspector] tenantId", tenantId || null);
      console.log("[admin/xero-inspector] tenantName", connection.external_entity_name || null);
      if (!tenantId) error = "Active Xero connection is missing tenantId.";
      if (!accessToken) error = "Active Xero connection is missing a usable encrypted access token.";
    }

    if (connection && tenantId && accessToken) {
      const [accounts, trialBalance, balanceSheet, profitAndLoss] = await Promise.all([
        xeroGet({ accessToken, tenantId, path: "Accounts" }),
        xeroGet({ accessToken, tenantId, path: `Reports/TrialBalance?date=${reportPeriod.endDate}` }),
        xeroGet({ accessToken, tenantId, path: `Reports/BalanceSheet?date=${reportPeriod.endDate}` }),
        xeroGet({ accessToken, tenantId, path: `Reports/ProfitAndLoss?fromDate=${reportPeriod.startDate}&toDate=${reportPeriod.endDate}` }),
      ]);

      accountsApiStatus = accounts.statusCode ?? "-";
      accountsApiError = accounts.error || "";
      trialBalanceApiStatus = trialBalance.statusCode ?? "-";
      trialBalanceApiError = trialBalance.error || "";
      balanceSheetApiStatus = balanceSheet.statusCode ?? "-";
      balanceSheetApiError = balanceSheet.error || "";
      profitAndLossApiStatus = profitAndLoss.statusCode ?? "-";
      profitAndLossApiError = profitAndLoss.error || "";
      rawAccounts = Array.isArray(accounts.payload.Accounts) ? accounts.payload.Accounts : [];
      rawTrialBalanceFlattened = flattenRows(reportRows(trialBalance.payload));
      trialBalanceApiRowCount = rawTrialBalanceFlattened.length;
      balanceSheetApiRowCount = flattenRows(reportRows(balanceSheet.payload)).length;
      profitAndLossApiRowCount = flattenRows(reportRows(profitAndLoss.payload)).length;

      const latestNormalized = await getLatestNormalizedAccountingData({
        companyId: String(connection.metadata_json?.company_id || connection.user_id || ""),
        connectionId: connection.id,
        sourceSystem: "xero",
        reportPeriod: null,
      });
      if (latestNormalized?.normalizedData) {
        normalizedAccounts = latestNormalized.normalizedData.normalizedAccounts as unknown as Array<Record<string, unknown>>;
        normalizedTrialBalance = latestNormalized.normalizedData.normalizedTrialBalance as unknown as Array<Record<string, unknown>>;
        normalizedBalanceSheet = latestNormalized.normalizedData.normalizedBalanceSheet as unknown as Array<Record<string, unknown>>;
        normalizedIncomeStatement = latestNormalized.normalizedData.normalizedIncomeStatement as unknown as Array<Record<string, unknown>>;
      }

      try {
        const decryptedConnection = {
          ...connection,
          access_token: accessToken,
          refresh_token: decryptAccountingToken(connection.refresh_token),
        };
        const bundle = await xeroAccountingProvider.getPrimaryFinancialReports({
          connection: decryptedConnection,
          dateRange: reportPeriod,
        });
        const rawDiagnostics = ((bundle.sourceMetadata.raw as Record<string, unknown> | undefined)?.diagnostics as Record<string, unknown> | undefined) || {};
        reportMappingDiagnostics = (rawDiagnostics.xeroReportMappingDiagnostics as typeof reportMappingDiagnostics | undefined) || {};
        const normalized = buildAdvisacorNormalizedFinancialData({
          connection: decryptedConnection,
          bundle,
          adapterName: "xeroAdapter",
          syncId: "admin-xero-inspector",
          reportPeriod,
          tenantId,
          tenantName: connection.external_entity_name || "Xero Organization",
        });
        console.info("NORMALIZATION COMPLETE", {
          companyId: normalized.companyId || String(connection.metadata_json?.company_id || connection.user_id || ""),
          connectionId: connection.id,
          tenantId,
          tenantName: connection.external_entity_name || "Xero Organization",
          sourceSystem: normalized.sourceSystem,
          reportPeriod,
        });
        if (!latestNormalized?.normalizedData) {
          normalizedAccounts = normalized.normalizedAccounts as unknown as Array<Record<string, unknown>>;
          normalizedTrialBalance = normalized.normalizedTrialBalance as unknown as Array<Record<string, unknown>>;
          normalizedBalanceSheet = normalized.normalizedBalanceSheet as unknown as Array<Record<string, unknown>>;
          normalizedIncomeStatement = normalized.normalizedIncomeStatement as unknown as Array<Record<string, unknown>>;
        }
      } catch (exception) {
        mappingError = exception instanceof Error ? exception.message : "Xero normalization failed.";
      }
    }
  } catch (exception) {
    error = exception instanceof Error ? exception.message : "Unable to load Xero inspector.";
  }

  return (
    <main className="min-h-screen bg-[#0A1020] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">Temporary Xero Diagnostic</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">Xero Data Inspector</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Diagnostics only: Xero API to raw results to normalized results. This page does not run PDF, PowerPoint, dashboard, Pulse, KPI, Flux, or QuickBooks paths.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-amber-300/25 bg-amber-400/10 p-5 text-amber-100">
            <p className="font-black">Inspector unavailable</p>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        )}

        {mappingError && (
          <div className="mb-6 rounded-3xl border border-red-300/25 bg-red-400/10 p-5 text-red-100">
            <p className="font-black">Normalization error</p>
            <p className="mt-2 text-sm">{mappingError}</p>
          </div>
        )}

        <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <h2 className="text-xl font-black text-white">Connection</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <DataCard label="Source System" value={connection?.provider || "xero"} />
            <DataCard label="Tenant Name" value={connection?.external_entity_name || "Xero Organization"} />
            <DataCard label="Tenant ID" value={tenantId} />
            <DataCard label="Connection ID" value={connection?.id || ""} />
            <DataCard label="Last Sync" value={String(connection?.metadata_json?.last_synced_at || connection?.updated_at || "")} />
          </div>
          <form method="post" action="/api/admin/xero-inspector/force-save" className="mt-5">
            <button type="submit" className="rounded-2xl border border-cyan-200/40 bg-cyan-400/10 px-5 py-3 text-sm font-black text-cyan-50">
              Force Save Current Inspector Sync
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <h2 className="text-xl font-black text-white">Raw API Results</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DataCard label="Accounts API Status" value={accountsApiStatus} />
            <DataCard label="Accounts API Error" value={accountsApiError} />
            <DataCard label="Accounts API Count" value={rawAccounts.length} />
            <DataCard label="Trial Balance API Status" value={trialBalanceApiStatus} />
            <DataCard label="Trial Balance API Error" value={trialBalanceApiError} />
            <DataCard label="Trial Balance API Row Count" value={trialBalanceApiRowCount} />
            <DataCard label="Balance Sheet API Status" value={balanceSheetApiStatus} />
            <DataCard label="Balance Sheet API Error" value={balanceSheetApiError} />
            <DataCard label="Balance Sheet API Row Count" value={balanceSheetApiRowCount} />
            <DataCard label="Profit & Loss API Status" value={profitAndLossApiStatus} />
            <DataCard label="Profit & Loss API Error" value={profitAndLossApiError} />
            <DataCard label="Profit & Loss API Row Count" value={profitAndLossApiRowCount} />
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <h2 className="text-xl font-black text-white">Normalized Results</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DataCard label="normalizedAccounts Count" value={normalizedAccounts.length} />
            <DataCard label="normalizedTrialBalance Count" value={normalizedTrialBalance.length} />
            <DataCard label="normalizedBalanceSheet Count" value={normalizedBalanceSheet.length} />
            <DataCard label="normalizedIncomeStatement Count" value={normalizedIncomeStatement.length} />
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <h2 className="text-xl font-black text-white">Report-Specific Mapping Diagnostics</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DataCard label="Accounts Raw Count" value={reportMappingDiagnostics.accounts?.rawCount ?? rawAccounts.length} />
            <DataCard label="Accounts Mapped Count" value={reportMappingDiagnostics.accounts?.mappedCount ?? normalizedAccounts.length} />
            <DataCard label="Accounts Error" value={reportMappingDiagnostics.accounts?.error || ""} />
            <DataCard label="Trial Balance Raw Count" value={reportMappingDiagnostics.trialBalance?.rawCount ?? trialBalanceApiRowCount} />
            <DataCard label="Trial Balance Mapped Count" value={reportMappingDiagnostics.trialBalance?.mappedCount ?? normalizedTrialBalance.length} />
            <DataCard label="Trial Balance Error" value={reportMappingDiagnostics.trialBalance?.error || ""} />
            <DataCard label="Balance Sheet Raw Count" value={reportMappingDiagnostics.balanceSheet?.rawCount ?? balanceSheetApiRowCount} />
            <DataCard label="Balance Sheet Mapped Count" value={reportMappingDiagnostics.balanceSheet?.mappedCount ?? normalizedBalanceSheet.length} />
            <DataCard label="Balance Sheet Error" value={reportMappingDiagnostics.balanceSheet?.error || ""} />
            <DataCard label="Income Statement Raw Count" value={reportMappingDiagnostics.incomeStatement?.rawCount ?? profitAndLossApiRowCount} />
            <DataCard label="Income Statement Mapped Count" value={reportMappingDiagnostics.incomeStatement?.mappedCount ?? normalizedIncomeStatement.length} />
            <DataCard label="Income Statement Error" value={reportMappingDiagnostics.incomeStatement?.error || ""} />
          </div>
        </section>

        <div className="mt-6 grid gap-6">
          <InspectorTable title="Raw Accounts" rows={rawAccountRows(rawAccounts)} />
          <InspectorTable title="Mapped Accounts" rows={mappedAccountRows(normalizedAccounts)} />
          <InspectorTable title="Raw Trial Balance Rows" rows={rawTrialBalanceRows(rawTrialBalanceFlattened)} />
          <InspectorTable title="Mapped Trial Balance Rows" rows={mappedTrialBalanceRows(normalizedTrialBalance)} />
        </div>
      </div>
    </main>
  );
}
