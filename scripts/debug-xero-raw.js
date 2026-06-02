/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { createClient } = require("@supabase/supabase-js");

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
    return { startDate: debugDate.slice(0, 8) + "01", endDate: debugDate, source: "XERO_DEBUG_REPORT_DATE" };
  }
  return { ...latestCompletedMonth(), source: "latest_completed_month" };
}

function countRows(rows = []) {
  return rows.reduce((count, row) => {
    const nested = Array.isArray(row?.Rows) ? row.Rows : [];
    return count + 1 + countRows(nested);
  }, 0);
}

function cellValue(cell) {
  return String(cell?.Value ?? cell?.value ?? "");
}

function collectTitles(rows = [], titles = []) {
  for (const row of rows) {
    const cells = Array.isArray(row?.Cells) ? row.Cells : [];
    const title = cellValue(cells[0]) || row?.Title || row?.RowType || "";
    if (title) titles.push(String(title));
    if (Array.isArray(row?.Rows)) collectTitles(row.Rows, titles);
  }
  return titles;
}

async function xeroGet({ accessToken, tenantId, path }) {
  const response = await fetch(`https://api.xero.com/api.xro/2.0/${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-tenant-id": tenantId,
      Accept: "application/json",
    },
  });
  const payload = await response.json().catch(() => ({}));
  return {
    statusCode: response.status,
    ok: response.ok,
    payload,
  };
}

async function debugXeroRaw() {
  loadLocalEnv();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Missing Supabase service credentials for Xero raw debug.");

  const { decryptAccountingToken } = require("../lib/integrations/accounting/token-encryption.ts");
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
  if (!data?.[0]) throw new Error("No connected Xero tenant found. Complete Xero OAuth, then rerun npm run debug:xero-raw.");

  const connection = data[0];
  const tenantId = connection.tenant_or_realm_id || String(connection.external_entity_id || "").replace(/^xero:/, "");
  if (!tenantId) throw new Error("Connected Xero row is missing selected tenantId.");

  const accessToken = decryptAccountingToken(connection.access_token);
  if (!accessToken) throw new Error("Connected Xero row is missing a usable encrypted access token.");

  const reportPeriod = debugReportPeriod();
  const [accounts, balanceSheet, profitAndLoss, trialBalance] = await Promise.all([
    xeroGet({ accessToken, tenantId, path: "Accounts" }),
    xeroGet({ accessToken, tenantId, path: `Reports/BalanceSheet?date=${reportPeriod.endDate}` }),
    xeroGet({ accessToken, tenantId, path: `Reports/ProfitAndLoss?fromDate=${reportPeriod.startDate}&toDate=${reportPeriod.endDate}` }),
    xeroGet({ accessToken, tenantId, path: `Reports/TrialBalance?date=${reportPeriod.endDate}` }),
  ]);

  const balanceRows = balanceSheet.payload?.Reports?.[0]?.Rows || [];
  const profitRows = profitAndLoss.payload?.Reports?.[0]?.Rows || [];
  const trialRows = trialBalance.payload?.Reports?.[0]?.Rows || [];
  const summary = {
    tenantId,
    tenantName: connection.external_entity_name || "Xero Organization",
    reportPeriod,
    accountsCount: Array.isArray(accounts.payload?.Accounts) ? accounts.payload.Accounts.length : 0,
    balanceSheetRawRowCount: countRows(balanceRows),
    profitAndLossRawRowCount: countRows(profitRows),
    trialBalanceRawRowCount: countRows(trialRows),
    statusCodes: {
      accounts: accounts.statusCode,
      balanceSheet: balanceSheet.statusCode,
      profitAndLoss: profitAndLoss.statusCode,
      trialBalance: trialBalance.statusCode,
    },
    first10BalanceSheetRowTitles: collectTitles(balanceRows).slice(0, 10),
    first10ProfitAndLossRowTitles: collectTitles(profitRows).slice(0, 10),
    first10TrialBalanceRowTitles: collectTitles(trialRows).slice(0, 10),
  };

  console.log(JSON.stringify(summary, null, 2));
}

debugXeroRaw().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
