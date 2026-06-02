/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const Module = require("module");
const ts = require("typescript");
const { createClient } = require("@supabase/supabase-js");

const originalLoad = Module._load;
Module._load = function loadWithXeroDebugStubs(request, parent, isMain) {
  if (request.endsWith("erp-adapters/quickbooks-adapter") || request.endsWith("erp-adapters\\quickbooks-adapter")) {
    return {
      QuickBooksAdapter: class QuickBooksDebugAdapter {
        connect() {
          return { url: "about:blank" };
        }
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const root = process.cwd();

function loadLocalEnv() {
  for (const file of [".env.local", ".env"]) {
    const envPath = path.join(root, file);
    if (!fs.existsSync(envPath)) continue;
    fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex === -1) return;
        const key = trimmed.slice(0, separatorIndex).trim();
        const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
        if (key && !process.env[key]) process.env[key] = value;
      });
  }
}

function latestCompletedMonth() {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
  const start = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function debugReportPeriod() {
  const debugDate = String(process.env.XERO_DEBUG_REPORT_DATE || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(debugDate)) {
    return { startDate: `${debugDate.slice(0, 8)}01`, endDate: debugDate, source: "XERO_DEBUG_REPORT_DATE" };
  }
  return { ...latestCompletedMonth(), source: "latest_completed_month" };
}

function reportRows(payload) {
  return Array.isArray(payload?.Reports?.[0]?.Rows) ? payload.Reports[0].Rows : [];
}

function flattenRows(rows = [], flattened = []) {
  for (const row of rows) {
    flattened.push(row);
    if (Array.isArray(row?.Rows)) flattenRows(row.Rows, flattened);
  }
  return flattened;
}

async function xeroGet({ accessToken, tenantId, path: requestPath }) {
  const response = await fetch(`https://api.xero.com/api.xro/2.0/${requestPath}`, {
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
    error: response.ok ? null : payload?.Message || payload?.Detail || payload?.ErrorNumber || "Xero request failed",
    payload,
  };
}

async function loadActiveXeroConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service credentials for Xero fetch debug.");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = supabase
    .from("accounting_connections")
    .select("*")
    .eq("provider", "xero")
    .in("status", ["connected", "needs_entity_selection"])
    .order("updated_at", { ascending: false });
  if (process.env.XERO_LIVE_CONNECTION_ID) query = query.eq("id", process.env.XERO_LIVE_CONNECTION_ID);

  const { data, error } = await query.limit(1);
  if (error) throw error;
  if (!data?.[0]) throw new Error("No active Xero connection found. Complete Xero OAuth, then rerun npm run debug:xero-fetch.");
  return data[0];
}

async function debugXeroFetch() {
  loadLocalEnv();
  const { decryptAccountingToken } = require("../lib/integrations/accounting/token-encryption.ts");
  const { xeroAdapter } = require("../lib/integrations/accounting/provider-adapters.ts");

  const storedConnection = await loadActiveXeroConnection();
  const tenantId = storedConnection.tenant_or_realm_id || String(storedConnection.external_entity_id || "").replace(/^xero:/, "");
  if (!tenantId) throw new Error("Active Xero connection is missing selected tenantId.");

  const accessToken = decryptAccountingToken(storedConnection.access_token);
  if (!accessToken) throw new Error("Active Xero connection is missing a usable encrypted access token.");

  const connection = {
    ...storedConnection,
    access_token: accessToken,
    refresh_token: decryptAccountingToken(storedConnection.refresh_token),
  };
  const reportPeriod = debugReportPeriod();

  const [accounts, trialBalance, balanceSheet, profitAndLoss] = await Promise.all([
    xeroGet({ accessToken, tenantId, path: "Accounts" }),
    xeroGet({ accessToken, tenantId, path: `Reports/TrialBalance?date=${reportPeriod.endDate}` }),
    xeroGet({ accessToken, tenantId, path: `Reports/BalanceSheet?date=${reportPeriod.endDate}` }),
    xeroGet({ accessToken, tenantId, path: `Reports/ProfitAndLoss?fromDate=${reportPeriod.startDate}&toDate=${reportPeriod.endDate}` }),
  ]);

  const rawAccounts = Array.isArray(accounts.payload?.Accounts) ? accounts.payload.Accounts : [];
  const trialRows = reportRows(trialBalance.payload);
  const balanceRows = reportRows(balanceSheet.payload);
  const profitRows = reportRows(profitAndLoss.payload);

  let normalized = null;
  let mappingError = null;
  try {
    const rawReports = await xeroAdapter.fetchRawReports(connection, reportPeriod);
    normalized = await xeroAdapter.normalize(rawReports, {
      connection,
      reportPeriod,
      syncId: "debug-xero-fetch",
      tenantId,
      tenantName: storedConnection.external_entity_name || "Xero Organization",
    });
  } catch (error) {
    mappingError = error?.message || String(error);
  }

  const summary = {
    activeXeroConnection: {
      tenantId,
      tenantName: storedConnection.external_entity_name || "Xero Organization",
      sourceSystem: storedConnection.provider,
      connectionId: storedConnection.id,
    },
    reportPeriod,
    rawXeroApiResultsBeforeMapping: {
      accountsStatus: accounts.statusCode,
      accountsError: accounts.error,
      rawAccountsCount: rawAccounts.length,
      trialBalanceStatus: trialBalance.statusCode,
      trialBalanceError: trialBalance.error,
      rawTrialBalanceTopLevelRowsCount: trialRows.length,
      rawTrialBalanceFlattenedRowsCount: flattenRows(trialRows).length,
      balanceSheetStatus: balanceSheet.statusCode,
      balanceSheetError: balanceSheet.error,
      rawBalanceSheetTopLevelRowsCount: balanceRows.length,
      rawBalanceSheetFlattenedRowsCount: flattenRows(balanceRows).length,
      profitAndLossStatus: profitAndLoss.statusCode,
      profitAndLossError: profitAndLoss.error,
      rawProfitAndLossTopLevelRowsCount: profitRows.length,
      rawProfitAndLossFlattenedRowsCount: flattenRows(profitRows).length,
    },
    normalizedResultAfterMapping: {
      normalizedAccountsCount: normalized?.normalizedAccounts?.length ?? 0,
      normalizedTrialBalanceCount: normalized?.normalizedTrialBalance?.length ?? 0,
      normalizedBalanceSheetCount: normalized?.normalizedBalanceSheet?.length ?? 0,
      normalizedIncomeStatementCount: normalized?.normalizedIncomeStatement?.length ?? 0,
      mappingError,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
  if (mappingError) process.exitCode = 1;
}

debugXeroFetch().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
