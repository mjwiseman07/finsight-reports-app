import Link from "next/link";
import { buildAdvisacorNormalizedFinancialData } from "../../../lib/integrations/accounting/advisacor-data-model";
import { xeroAccountingProvider } from "../../../lib/integrations/accounting/providers/xero";
import { decryptAccountingToken } from "../../../lib/integrations/accounting/token-encryption";
import type { AccountingConnectionRecord, AccountingDateRange } from "../../../lib/integrations/accounting/types";
import { supabaseAdmin } from "../../../lib/supabase";
import { SiteNav } from "../../../components/SiteNav";
import { SiteFooter } from "../../../components/SiteFooter";
import { headingFont, focusRing } from "../../../components/site-ui";

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
    <div className="rounded-2xl border border-[#C9A961]/20 bg-[#111112] p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#7A7974]">{label}</p>
      <p className="mt-2 break-words text-lg font-black text-[#ECEBE7]">{safeValue(value)}</p>
    </div>
  );
}

function MappedRowsTable({ title, rows }: { title: string; rows: Array<Record<string, RowValue>> }) {
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  return (
    <section className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-5 shadow-2xl shadow-black/40">
      <h2 className={`${headingFont} text-xl font-black text-[#ECEBE7]`}>{title}</h2>
      <p className="mt-1 text-sm text-[#A29E93]">First 20 mapped rows. Source/raw payloads are intentionally hidden.</p>
      {rows.length ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-[#7A7974]">
              <tr>
                {columns.map((column) => (
                  <th key={column} className="border-b border-[#C9A961]/20 px-3 py-2">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[#ECEBE7]">
              {rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-b border-[#C9A961]/10">
                  {columns.map((column) => (
                    <td key={column} className="px-3 py-2">{safeValue(row[column])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl border border-[#BB653B]/40 bg-[#BB653B]/15 px-4 py-3 text-sm font-bold text-[#DFC084]">
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
    <div className="min-h-screen bg-[#111112] text-[#ECEBE7]">
      <SiteNav />

      <section className="relative overflow-hidden bg-[#111112]">
        <div className="mx-auto max-w-7xl px-6 pb-10 pt-[200px] sm:px-8 md:pt-[240px] lg:pt-[260px]">
          <p className={`${headingFont} text-xs uppercase tracking-[0.35em] text-[#C9A961]`}>
            Founder Console — Xero Diagnostics
          </p>
          <h1 className={`${headingFont} mt-3 text-4xl font-semibold text-[#ECEBE7] sm:text-5xl`}>
            Xero Data Explorer
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#A29E93]">
            Diagnostics only: Xero API to raw data to normalized data. No PDF, PowerPoint, dashboard, Pulse, KPI, Flux, or QuickBooks paths run here.
          </p>
          <div className="mt-6">
            <Link
              href="/admin"
              className={`inline-flex items-center gap-2 rounded-full border border-[#C9A961]/25 bg-[#1A1A1C]/85 px-4 py-2 text-sm font-medium text-[#ECEBE7] transition hover:border-[#C9A961]/60 hover:bg-[#C9A961]/10 ${focusRing()}`}
            >
              ← Back to Admin Workspace
            </Link>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 pb-16 sm:px-8">
        {error && (
          <div className="mb-6 rounded-3xl border border-[#BB653B]/40 bg-[#BB653B]/15 p-5 text-[#DFC084]">
            <p className="font-black">Xero debug unavailable</p>
            <p className="mt-2 text-sm">{error}</p>
          </div>
        )}

        {mappingError && (
          <div className="mb-6 rounded-3xl border border-[#B85C5C]/40 bg-[#B85C5C]/15 p-5 text-[#F0BFBF]">
            <p className="font-black">Normalization error</p>
            <p className="mt-2 text-sm">{mappingError}</p>
          </div>
        )}

        <section className="rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-5 shadow-2xl shadow-black/40">
          <h2 className={`${headingFont} text-xl font-black text-[#ECEBE7]`}>Connection</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <DataCard label="Tenant Name" value={connection?.external_entity_name || "Xero Organization"} />
            <DataCard label="Tenant ID" value={tenantId} />
            <DataCard label="Source System" value={connection?.provider || "xero"} />
            <DataCard label="Last Sync" value={String(connection?.metadata_json?.last_synced_at || connection?.updated_at || "")} />
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-5 shadow-2xl shadow-black/40">
          <h2 className={`${headingFont} text-xl font-black text-[#ECEBE7]`}>Raw Fetch Results</h2>
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

        <section className="mt-6 rounded-3xl border border-[#C9A961]/20 bg-[#1A1A1C]/85 p-5 shadow-2xl shadow-black/40">
          <h2 className={`${headingFont} text-xl font-black text-[#ECEBE7]`}>Normalized Results</h2>
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
      </main>

      <SiteFooter />
    </div>
  );
}
