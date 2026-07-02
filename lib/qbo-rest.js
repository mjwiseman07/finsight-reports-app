function getQboBaseUrl() {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export async function qboApiCall(accessToken, url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(
      payload?.Fault?.Error?.[0]?.Message ||
        payload?.error ||
        `QuickBooks API request failed (${response.status})`,
    );
  }
  return payload;
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
