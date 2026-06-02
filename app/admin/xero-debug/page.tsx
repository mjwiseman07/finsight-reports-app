import { buildAdvisacorNormalizedFinancialData } from "../../../lib/integrations/accounting/advisacor-data-model";
import { xeroAccountingProvider } from "../../../lib/integrations/accounting/providers/xero";
import { decryptAccountingToken } from "../../../lib/integrations/accounting/token-encryption";
import type { AccountingConnectionRecord, AccountingDateRange } from "../../../lib/integrations/accounting/types";
import { supabaseAdmin } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

type XeroApiResult = {
  statusCode: number | null;
  ok: boolean;
  error: string | null;
  payload: Record<string, unknown>;
};

type RowValue = string | number | boolean | null | undefined;

function latestCompletedMonth(): AccountingDateRange {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
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

async function loadActiveConnection() {
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

function safeValue(value: RowValue) {
  if (value === undefined || value === null || value === "") return "-";
  return String(value);
}

function accountRows(rows: Array<Record<string, unknown>>) {
  return rows.slice(0, 20).map((row) => ({
    id: row.id as RowValue,
    name: row.name as RowValue,
    accountNumber: row.accountNumber as RowValue,
    accountType: row.accountType as RowValue,
    accountClass: row.accountClass as RowValue,
    status: row.status as RowValue,
  }));
}

function trialBalanceRows(rows: Array<Record<string, unknown>>) {
  return rows.slice(0, 20).map((row) => ({
    accountId: row.accountId as RowValue,
    accountName: row.accountName as RowValue,
    debit: row.debit as RowValue,
    credit: row.credit as RowValue,
    netAmount: row.netAmount as RowValue,
  }));
}

function statementRows(rows: Array<Record<string, unknown>>) {
  return rows.slice(0, 20).map((row) => ({
    label: row.label as RowValue,
    section: row.section as RowValue,
    amount: row.amount as RowValue,
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

function MappedRowsTable({ title, rows }: { title: string; rows: Array<Record<string, RowValue>> }) {
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">First 20 mapped rows. Source/raw payloads are intentionally hidden.</p>
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
          No mapped rows available.
        </p>
      )}
    </section>
  );
}

export default async function XeroDebugPage() {
  let error = "";
  let connection: AccountingConnectionRecord | null = null;
  let tenantId = "";
  let accessToken = "";
  let rawAccountsCount = 0;
  let trialTopRows = 0;
  let trialFlatRows = 0;
  let balanceTopRows = 0;
  let balanceFlatRows = 0;
  let profitTopRows = 0;
  let profitFlatRows = 0;
  let normalizedAccounts: Array<Record<string, unknown>> = [];
  let normalizedTrialBalance: Array<Record<string, unknown>> = [];
  let normalizedBalanceSheet: Array<Record<string, unknown>> = [];
  let normalizedIncomeStatement: Array<Record<string, unknown>> = [];
  let mappingError = "";
  const reportPeriod = latestCompletedMonth();

  try {
    connection = await loadActiveConnection();
    if (!connection) {
      error = "No active Xero connection found. Connect and select a Xero organization, then reload this page.";
    } else {
      tenantId = connection.tenant_or_realm_id || connection.external_entity_id?.replace(/^xero:/, "") || "";
      accessToken = decryptAccountingToken(connection.access_token) || "";
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

      const accountsPayload = Array.isArray(accounts.payload.Accounts) ? accounts.payload.Accounts : [];
      const trialRows = reportRows(trialBalance.payload);
      const balanceRows = reportRows(balanceSheet.payload);
      const profitRows = reportRows(profitAndLoss.payload);
      rawAccountsCount = accountsPayload.length;
      trialTopRows = trialRows.length;
      trialFlatRows = flattenRows(trialRows).length;
      balanceTopRows = balanceRows.length;
      balanceFlatRows = flattenRows(balanceRows).length;
      profitTopRows = profitRows.length;
      profitFlatRows = flattenRows(profitRows).length;

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
        const normalized = buildAdvisacorNormalizedFinancialData({
          connection: decryptedConnection,
          bundle,
          adapterName: "xeroAdapter",
          syncId: "admin-xero-debug",
          reportPeriod,
          tenantId,
          tenantName: connection.external_entity_name || "Xero Organization",
        });
        normalizedAccounts = normalized.normalizedAccounts as unknown as Array<Record<string, unknown>>;
        normalizedTrialBalance = normalized.normalizedTrialBalance as unknown as Array<Record<string, unknown>>;
        normalizedBalanceSheet = normalized.normalizedBalanceSheet as unknown as Array<Record<string, unknown>>;
        normalizedIncomeStatement = normalized.normalizedIncomeStatement as unknown as Array<Record<string, unknown>>;
      } catch (mappingException) {
        mappingError = mappingException instanceof Error ? mappingException.message : "Xero normalization failed.";
      }
    }
  } catch (exception) {
    error = exception instanceof Error ? exception.message : "Unable to load Xero diagnostics.";
  }

  return (
    <main className="min-h-screen bg-[#0A1020] px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-200">Temporary Admin Diagnostic</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.04em]">Xero Data Explorer</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Diagnostics only: Xero API to raw data to normalized data. No PDF, PowerPoint, dashboard, Pulse, KPI, Flux, or QuickBooks paths run here.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-3xl border border-amber-300/25 bg-amber-400/10 p-5 text-amber-100">
            <p className="font-black">Xero debug unavailable</p>
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
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DataCard label="Tenant Name" value={connection?.external_entity_name || "Xero Organization"} />
            <DataCard label="Tenant ID" value={tenantId} />
            <DataCard label="Source System" value={connection?.provider || "xero"} />
            <DataCard label="Last Sync" value={String(connection?.metadata_json?.last_synced_at || connection?.updated_at || "")} />
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <h2 className="text-xl font-black text-white">Raw Fetch Results</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DataCard label="Accounts API Count" value={rawAccountsCount} />
            <DataCard label="Trial Balance Top-Level Rows" value={trialTopRows} />
            <DataCard label="Trial Balance Flattened Rows" value={trialFlatRows} />
            <DataCard label="Balance Sheet Top-Level Rows" value={balanceTopRows} />
            <DataCard label="Balance Sheet Flattened Rows" value={balanceFlatRows} />
            <DataCard label="Profit & Loss Top-Level Rows" value={profitTopRows} />
            <DataCard label="Profit & Loss Flattened Rows" value={profitFlatRows} />
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

        <div className="mt-6 grid gap-6">
          <MappedRowsTable title="Accounts" rows={accountRows(normalizedAccounts)} />
          <MappedRowsTable title="Trial Balance" rows={trialBalanceRows(normalizedTrialBalance)} />
          <MappedRowsTable title="Balance Sheet" rows={statementRows(normalizedBalanceSheet)} />
          <MappedRowsTable title="Income Statement" rows={statementRows(normalizedIncomeStatement)} />
        </div>
      </div>
    </main>
  );
}
