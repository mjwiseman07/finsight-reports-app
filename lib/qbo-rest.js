function getQboBaseUrl() {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export async function qboApiCall(accessToken, url, { context } = {}) {
  const { qboApiFetch } = await import("./qbo/api-fetch.js");
  const { ok, status, json, intuit_tid } = await qboApiFetch(url, {
    accessToken,
    method: "GET",
    context,
  });
  if (!ok) {
    const message =
      json?.Fault?.Error?.[0]?.Message ||
      json?.error ||
      `QuickBooks API request failed (${status})`;
    const err = new Error(message);
    err.intuit_tid = intuit_tid;
    err.status = status;
    throw err;
  }
  return json;
}

export async function qboReport(accessToken, realmId, reportName, options = {}) {
  const params = new URLSearchParams(options);
  const url = `${getQboBaseUrl()}/v3/company/${realmId}/reports/${reportName}?${params.toString()}`;
  return qboApiCall(accessToken, url);
}

export async function qboQuery(accessToken, realmId, query) {
  const url = `${getQboBaseUrl()}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`;
  return qboApiCall(accessToken, url);
}

export function extractQueryEntities(payload, entityName) {
  const queryResponse = payload?.QueryResponse;
  if (!queryResponse) return [];
  const rows = queryResponse[entityName];
  if (Array.isArray(rows)) return rows;
  if (rows) return [rows];
  return [];
}

export function walkReportRows(rows, visitor) {
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    visitor(row);
    if (Array.isArray(row?.Rows?.Row)) walkReportRows(row.Rows.Row, visitor);
  }
}

// ─── Close-packet convenience report wrappers (Doc C2) ─────────────────────
// These take (accessToken, realmId, opts) and return the raw QBO report JSON,
// matching how the close-packet section builders consume them.

export async function reportProfitAndLoss(accessToken, realmId, { start_date, end_date } = {}) {
  return qboReport(accessToken, realmId, "ProfitAndLoss", {
    accounting_method: "Accrual",
    summarize_column_by: "Total",
    start_date,
    end_date,
  });
}

export async function reportBalanceSheet(accessToken, realmId, { end_date } = {}) {
  return qboReport(accessToken, realmId, "BalanceSheet", {
    accounting_method: "Accrual",
    end_date,
  });
}

export async function reportCashFlow(accessToken, realmId, { start_date, end_date } = {}) {
  return qboReport(accessToken, realmId, "CashFlow", { start_date, end_date });
}

// Returns an array of JournalEntry entities for the period.
export async function findJournalEntries(accessToken, realmId, { start_date, end_date } = {}) {
  const payload = await qboQuery(
    accessToken,
    realmId,
    `select * from JournalEntry where TxnDate >= '${start_date}' and TxnDate <= '${end_date}' maxresults 1000`,
  );
  return extractQueryEntities(payload, "JournalEntry");
}
